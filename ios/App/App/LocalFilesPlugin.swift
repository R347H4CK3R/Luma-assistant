import Foundation

enum BackupFileError: Error { case invalidName, tooLarge, invalidUTF8, unreadable }
enum BackupFilePolicy {
    static let maxBytes = 3 * 1024 * 1024
    static func validate(text: String, fileName: String) throws -> Data {
        guard ["luma-backup.json", "luma-backup.encrypted.json"].contains(fileName) else {
            throw BackupFileError.invalidName
        }
        guard text.utf8.count <= maxBytes else { throw BackupFileError.tooLarge }
        return Data(text.utf8)
    }
    // Do not trust metadata, including file sizes reported by cloud providers.
    static func readUTF8(url: URL) throws -> String {
        let handle = try FileHandle(forReadingFrom: url)
        defer { try? handle.close() }
        var data = Data()
        while true {
            let chunk = try handle.read(upToCount: min(64 * 1024, maxBytes + 1 - data.count)) ?? Data()
            if chunk.isEmpty { break }
            data.append(chunk)
            guard data.count <= maxBytes else { throw BackupFileError.tooLarge }
        }
        guard let text = String(data: data, encoding: .utf8) else { throw BackupFileError.invalidUTF8 }
        return text
    }
}

#if !LOCAL_FILES_TESTING
import Capacitor
import UIKit
import UniformTypeIdentifiers

@objc(LocalFilesPlugin)
public final class LocalFilesPlugin: CAPPlugin, CAPBridgedPlugin, UIDocumentPickerDelegate, UIAdaptivePresentationControllerDelegate {
    public let identifier = "LocalFilesPlugin"
    public let jsName = "LocalFiles"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "exportBackup", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "importBackup", returnType: CAPPluginReturnPromise)
    ]
    // Accessed only on main queue. One picker/share/reader operation at a time.
    private var pending: CAPPluginCall?
    private var operation: UUID?
    private var exportDirectory: URL?
    private var importing = false
    private var reading = false
    private weak var activeController: UIViewController?

    @objc public func exportBackup(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { call.reject("File sharing unavailable.", "unavailable"); return }
            guard let text = call.getString("text"), let name = call.getString("fileName") else {
                call.reject("Backup text and an allowed file name are required.", "invalid_input"); return
            }
            let data: Data
            do { data = try BackupFilePolicy.validate(text: text, fileName: name) }
            catch { call.reject("Use an allowed backup file name and at most 3 MiB of UTF-8 text.", "invalid_input"); return }
            guard let presenter = self.begin(call, importing: false), let id = self.operation else { return }
            do {
                let dir = FileManager.default.temporaryDirectory.appendingPathComponent("LumaBackup-" + UUID().uuidString, isDirectory: true)
                self.exportDirectory = dir
                try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true,
                    attributes: [.protectionKey: FileProtectionType.complete])
                let file = dir.appendingPathComponent(name, isDirectory: false)
                try data.write(to: file, options: [.atomic, .completeFileProtection])
                let share = UIActivityViewController(activityItems: [file], applicationActivities: nil)
                share.completionWithItemsHandler = { [weak self] _, completed, _, error in
                    DispatchQueue.main.async {
                        guard let self = self, self.operation == id else { return }
                        if error != nil { self.fail("Unable to share the backup.", code: "export_failed") }
                        else { self.finish(["completed": completed]) }
                    }
                }
                if let popover = share.popoverPresentationController {
                    popover.sourceView = presenter.view
                    popover.sourceRect = CGRect(x: presenter.view.bounds.midX, y: presenter.view.bounds.midY, width: 1, height: 1)
                    popover.permittedArrowDirections = []
                }
                self.activeController = share
                presenter.present(share, animated: true)
                share.presentationController?.delegate = self
            } catch { self.fail("Unable to prepare the backup file.", code: "export_failed") }
        }
    }

    @objc public func importBackup(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { call.reject("File picker unavailable.", "unavailable"); return }
            guard let presenter = self.begin(call, importing: true) else { return }
            let picker = UIDocumentPickerViewController(forOpeningContentTypes: [.json, .data], asCopy: false)
            picker.allowsMultipleSelection = false
            picker.delegate = self
            self.activeController = picker
            presenter.present(picker, animated: true)
            picker.presentationController?.delegate = self
        }
    }

    private func begin(_ call: CAPPluginCall, importing: Bool) -> UIViewController? {
        guard pending == nil else { call.reject("A file operation is already open.", "busy"); return nil }
        guard let presenter = bridge?.viewController, presenter.viewIfLoaded?.window != nil,
              presenter.presentedViewController == nil else {
            call.reject("Close other dialogs before opening Files.", "presentation_unavailable"); return nil
        }
        self.pending = call; self.operation = UUID(); self.importing = importing
        return presenter
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        guard importing, !reading, activeController === controller else { return }
        finish(["text": "", "cancelled": true])
    }
    public func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
        guard activeController === presentationController.presentedViewController else { return }
        // Picker selection starts reading before dismissal. Do not cancel its read.
        if importing {
            if !reading { finish(["text": "", "cancelled": true]) }
        } else { finish(["completed": false]) }
    }
    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard importing, !reading, activeController === controller, let id = operation else { return }
        guard let url = urls.first else { finish(["text": "", "cancelled": true]); return }
        reading = true
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            let scoped = url.startAccessingSecurityScopedResource()
            defer { if scoped { url.stopAccessingSecurityScopedResource() } }
            var coordinationError: NSError?
            var result: Result<String, Error> = .failure(BackupFileError.unreadable)
            NSFileCoordinator().coordinate(readingItemAt: url, options: [], error: &coordinationError) { coordinatedURL in
                result = Result { try BackupFilePolicy.readUTF8(url: coordinatedURL) }
            }
            let outcome = coordinationError.map { Result<String, Error>.failure($0) } ?? result
            DispatchQueue.main.async {
                guard let self = self, self.operation == id else { return }
                switch outcome {
                case .success(let text): self.finish(["text": text, "cancelled": false])
                case .failure: self.fail("Choose a readable UTF-8 backup no larger than 3 MiB.", code: "import_failed")
                }
            }
        }
    }
    private func finish(_ value: JSObject) {
        let call = pending
        cleanup()
        call?.resolve(value)
    }
    private func fail(_ message: String, code: String) {
        let call = pending
        cleanup()
        call?.reject(message, code)
    }
    private func cleanup() {
        if let dir = exportDirectory { try? FileManager.default.removeItem(at: dir) }
        exportDirectory = nil; pending = nil; operation = nil; importing = false
        reading = false; activeController = nil
    }
    deinit {
        if let dir = exportDirectory { try? FileManager.default.removeItem(at: dir) }
    }
}
#endif
