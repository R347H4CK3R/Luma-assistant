import Foundation

@main struct LocalFilesTests {
    static func main() throws {
        func rejects(_ operation: () throws -> Void) {
            do { try operation(); fatalError("Expected rejection") } catch { }
        }
        let validated = try BackupFilePolicy.validate(text: "{}", fileName: "luma-backup.json")
        precondition(validated == Data("{}".utf8))
        _ = try BackupFilePolicy.validate(text: "{}", fileName: "luma-backup.encrypted.json")
        rejects { _ = try BackupFilePolicy.validate(text: "{}", fileName: "../luma-backup.json") }
        rejects { _ = try BackupFilePolicy.validate(text: "{}", fileName: "other.json") }
        rejects { _ = try BackupFilePolicy.validate(text: String(repeating: "😀", count: BackupFilePolicy.maxBytes / 4 + 1), fileName: "luma-backup.json") }
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: dir) }
        let url = dir.appendingPathComponent("sample")
        try Data(repeating: 97, count: BackupFilePolicy.maxBytes).write(to: url)
        let bounded = try BackupFilePolicy.readUTF8(url: url)
        precondition(bounded.utf8.count == BackupFilePolicy.maxBytes)
        try Data(repeating: 97, count: BackupFilePolicy.maxBytes + 1).write(to: url)
        rejects { _ = try BackupFilePolicy.readUTF8(url: url) }
        try Data([0xff]).write(to: url)
        rejects { _ = try BackupFilePolicy.readUTF8(url: url) }
        print("LocalFiles validation and bounded-reader tests passed")
    }
}
