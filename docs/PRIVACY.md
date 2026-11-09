# Privacy and security draft
Luma stores your saved notes and checklists in app-local web storage. There is no developer-operated backend, account system, analytics SDK or automatic cloud synchronization in this version. Storage is not encrypted by Luma. Device backups may include it.

Only the Connect form sends network requests. Before each request you review your configured HTTPS destination, model ID, question and any explicitly included memories. If supplied, an access token is sent to that exact server in an Authorization header and is never persisted by Luma. Server retention, provider processing, data charges and policy are controlled by the server operator. The developer cannot guarantee the privacy of a server you configure. Do not send sensitive information to an untrusted endpoint.

Deleting a memory removes it from current app storage, not an already exported backup or a remote server's prior logs. Exported backups are unencrypted. Import replaces current data only after confirmation. Clearing app data/uninstalling removes local records subject to operating-system backup behavior.

No calendar, contacts, location, camera, microphone, notification, accessibility, SMS or device-admin permissions are requested by application features. Internet access supports the optional connection. No background autonomous actions run. Model outputs are displayed as plain text and cannot invoke tools or change memory.

Before public distribution: publish an owner-controlled privacy/support URL, identify the legal publisher/contact, validate native backup behavior, perform dependency/security review, decide whether to add encrypted storage, and complete Apple's privacy labels and Google Play Data Safety using actual behavior. This document is a draft, not legal advice or a finished public privacy policy.
