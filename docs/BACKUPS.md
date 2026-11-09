# Portable backups

Plain JSON is interoperable with earlier Luma backups. Optional encryption wraps the same version-1 data in a versioned envelope: AES-256-GCM, 12-byte random IV, 16-byte random salt, PBKDF2-SHA256 with exactly 310,000 iterations, 256-bit non-exportable key and fixed additional authenticated data. Strict envelope/work-factor checks bound malformed input before derivation. A passphrase must be 12–256 characters; no passphrase is persisted and no recovery service exists.

This protects exported copies only. Local app memory remains unencrypted web storage. No network service receives data during encryption/decryption. WebCrypto must actually be available; the app reports an error instead of silently exporting plaintext when encryption is unavailable.

On iPhone, exports open the user-controlled system share sheet for a temporary protected file. Imports use a user-selected security-scoped URL and coordinated bounded reads; the app accepts no arbitrary file path from JavaScript. Operations are serialized. Imported plain or decrypted state is validated and replaces current state only after explicit confirmation. Failed decryption/import leaves current records unchanged. Browser/Android fallback uses downloads and a selected file input; Android native backup behavior remains unverified.

Passphrases are cleared from form fields after attempts. JavaScript strings cannot promise secure memory erasure; use OS protection and do not use a shared/untrusted device for sensitive backups. Temporary iPhone export files are removed after completion/cancellation; abrupt termination may leave protected temporary data until OS cleanup. Save copies only to destinations you trust.

Verification must distinguish unit/browser tests, native compile/tests and actual device behavior. Physical iPhone picker/share and WebCrypto availability still require testing on a supported installed build.
