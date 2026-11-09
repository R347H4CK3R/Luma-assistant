import Foundation

@main
struct LocalAssistantTests {
    static func main() throws {
        func invalid(_ q: Any?, _ n: Any?) {
            do { _ = try AssistantInput(question: q, notes: n); fatalError("Expected invalid input") }
            catch { precondition(error is AssistantInputError) }
        }
        invalid(nil, []); invalid("  \n", []); invalid(42, [])
        invalid(String(repeating: "x", count: 2001), [])
        invalid("hello", ["a", "b", "c", "d"])
        invalid("hello", [String(repeating: "a", count: 501)])
        invalid("hello", [1]); invalid("hello", nil)
        // UTF-16 matches the JavaScript length limit, including non-BMP characters.
        invalid(String(repeating: "😀", count: 1001), [])
        let valid = try AssistantInput(question: String(repeating: "a", count: 2000), notes: [String(repeating: "b", count: 500), "", "c"])
        precondition(valid.notes.count == 3)
        let gate = AssistantGenerationGate()
        let first = gate.begin()!
        precondition(gate.begin() == nil)
        precondition(gate.cancel() == first)
        precondition(gate.cancel() == nil)
        precondition(gate.begin() == nil, "Cancellation must keep the slot until the model drains")
        precondition(!gate.finish(UUID()), "Stale completions must not reset a generation")
        precondition(!gate.finish(first), "Cancelled completion must be suppressed")
        let second = gate.begin()!
        precondition(!gate.finish(first))
        precondition(gate.finish(second))
        precondition(!gate.isBusy)
        // Timeout uses the same cancellation transition, and failure completes normally.
        let timedOut = gate.begin()!
        precondition(gate.cancel() == timedOut)
        precondition(!gate.finish(timedOut))
        let failed = gate.begin()!
        precondition(gate.finish(failed))
        precondition(gate.cancel() == nil)
        let emptyNotes = try AssistantInput(question: "hello", notes: [String]())
        precondition(!emptyNotes.prompt.contains("Note 1:"))
        precondition(emptyNotes.prompt.contains("hello"))
        print("LocalAssistant native validation and lifecycle tests passed")
    }
}
