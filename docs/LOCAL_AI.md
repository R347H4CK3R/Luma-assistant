# On-device AI for supported iPhones

Luma's native Capacitor bridge uses Apple Foundation Models for bounded, single-turn text assistance. It is not a download of a proprietary model, a cloud proxy or a claim of parity with large hosted models.

## Requirements
- iOS 26 or later, built with an SDK that supports FoundationModels.
- Apple Intelligence-capable hardware, enabled in Settings.
- Required system model assets downloaded and language/region supported.

The plugin checks actual model availability. Unsupported devices show an explanation and keep memory/checklist features. It never sends a local request to a remote server. Separately configured Connect requests retain their existing explicit preview/approval flow.

## Data and actions
Questions are limited to 2,000 characters. Memory is excluded unless the user checks inclusion; at most three recent notes, 500 characters each, are passed as untrusted reference context. The frontend previews that context. Native bounds apply independently of the frontend. No tools, app control, autonomous execution, conversation history, persistent model sessions or automatic memory updates are exposed.

The model can be wrong, refuse requests or exceed its available context. Cancellation and timeout return an error rather than fabricated success; late output is discarded. The native generation slot remains occupied until the underlying task drains, avoiding parallel requests after cancellation. Save answer is a separate user action and follows existing storage limits. Notes remain unencrypted; avoid sensitive records.

## Compatibility and verification
Bundle ID `app.luma.personal`, storage key `luma.v1`, and backup version 1 are unchanged. No deletion or migration runs for this feature. Android/web builds show the unavailable explanation and retain all earlier features.

Unit tests cover prompt bounds, opt-in memory, unsupported behavior, concurrent rejection, cancellation and invalid output. Browser tests cover unavailable UI/no outgoing requests and existing memory preservation. Swift tests cover native validation and lifecycle independently from real inference. Compilation and these checks do not demonstrate on-device model quality: generation, cancellation and offline behavior require validation on a supported physical iPhone before claiming that verification.
