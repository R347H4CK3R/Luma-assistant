# Privacy and security draft
Luma stores your saved notes and checklists in app-local web storage. There is no developer-operated backend, account system, analytics SDK or automatic cloud synchronization in this version. Storage is not encrypted by Luma. Device backups may include it.

Only the Connect form sends network requests. Before each request you review your configured HTTPS destination, model ID, question and any explicitly included memories. If supplied, an access token is sent to that exact server in an Authorization header and is never persisted by Luma. Server retention, provider processing, data charges and policy are controlled by the server operator. The developer cannot guarantee the privacy of a server you configure. Do not send sensitive information to an untrusted endpoint.

Deleting a memory removes it from current app storage, not an already exported backup or a remote server's prior logs. Exported backups are unencrypted. Import replaces current data only after confirmation. Clearing app data/uninstalling removes local records subject to operating-system backup behavior.

No calendar, contacts, location, camera, microphone, notification, accessibility, SMS or device-admin permissions are requested by application features. Internet access supports the optional connection. No background autonomous actions run. Model outputs are displayed as plain text and cannot invoke tools or change memory.

Before public distribution: publish an owner-controlled privacy/support URL, identify the legal publisher/contact, validate native backup behavior, perform dependency/security review, decide whether to add encrypted storage, and complete Apple's privacy labels and Google Play Data Safety using actual behavior. This document is a draft, not legal advice or a finished public privacy policy.


## Optional on-device AI (iPhone)
The Ask tab uses Apple Foundation Models only when the device reports its system model available. The app passes your submitted question and explicitly selected bounded notes to the local system model. This path has no HTTP transport and never automatically falls back to cloud. Model setup/downloads and Apple Intelligence settings are managed by iOS. Results are shown in memory for the current app session; only pressing Save answer writes a note. No model output can execute actions. Clearing an answer removes it from the visible session state, not a note you previously saved.

## Portable backups
Plain JSON export remains available and contains readable notes. Optional encrypted export uses AES-256-GCM with a random salt/IV and PBKDF2-SHA256 (310,000 iterations) derived from a user-entered passphrase. The passphrase is not persisted or sent to a server; losing it means losing access to that encrypted backup. This protects the exported copy, not app-local storage. iPhone export opens the system share sheet and import opens a document picker, only after a user action; the user chooses any destination. Temporary export files use complete iOS file protection and are removed after share completion/cancellation. Imports are bounded, decrypted locally if necessary and replace app data only after confirmation.
