# Luma
### A little clarity goes a long way.

Luma is an independent, local-first personal planning assistant for iOS and Android. A warm dark interface puts your notes, next steps, and optional model conversations in one calm space. It is separate from GhostAI/Asterion Veyra: Luma focuses on everyday personal planning, not repository coding or GitHub automation.

**Status: early functional implementation, not an App Store-ready or approved release.** See `docs/RELEASE.md` for the remaining gates. No unlimited intelligence, unrestricted device control, or free hosted compute is promised.

## What works in source
- Create, search and individually delete persistent memories on the current device.
- Create and complete local goal checklists. These are explicitly labeled fixed templates, not simulated AI.
- Export/import validated JSON backups with confirmation before replacement.
- Optional OpenAI-compatible HTTPS chat, using your model name and optional session-only token.
- Review the destination and exact message payload before sending. Memories are excluded by default; including them is opt-in for each request. At most ten notes, 1,000 characters each, are included.
- Plain-text response rendering, no model-initiated tool execution, redirect rejection, response size and time limits.
- Shared responsive interface and generated native Capacitor iOS/Android projects.

## What is not implemented
On-device LLM inference, voice, cross-device sync, notification scheduling, calendar/mail integrations, background autonomous execution, secure/encrypted memory storage, account login and arbitrary app control. Luma cannot replace the operating system assistant or bypass platform permissions. iOS limits default-assistant roles and background work; Android capabilities also require explicit permissions and distribution-policy compliance.

## Free means no mandatory model subscription
Notes, search and checklist planning operate locally without paid APIs. General AI answers require a compatible server you explicitly configure. You can run an appropriately licensed open model on your own computer (for example Qwen 2.5 3B with a compatible serving layer). That is **not on-phone inference** and still uses your hardware, electricity and network. Cloud providers may charge or impose quotas. No provider key, subscription or hosted inference service is bundled. Model licenses and hardware requirements must be checked before distribution. Free app source does not waive Apple/Google developer registration, signing, hosting or store costs.

## Run and test
Requires Node 22+.

```sh
npm ci
npm test
npm run dev
npm run build
```

Open the development URL on the same machine. Production uses a strict Content Security Policy; Vite's development hot-reload may be restricted by it. Use the production build for browser/device QA.

## Android
Requires Android Studio, Java 21, Android SDK 35 and its build tools (see generated project's version settings).

```sh
npm run mobile:sync
cd android
./gradlew test lint assembleDebug
```

Debug APK output: `android/app/build/outputs/apk/debug/app-debug.apk`. Install a verified debug artifact on an authorized connected device with `adb install -r ...`. Release signing must use the owner's private keystore, never committed credentials. Debug APKs are test artifacts, not Play releases.

## iOS
Requires a Mac, compatible Xcode, CocoaPods, an Apple development team, and provisioning for device installation.

```sh
npm run mobile:sync
npx cap open ios
```

Select your team and bundle ID, then build/test on simulator and device. The starter bundle ID `app.luma.personal` must be replaced with one the publisher owns. This Linux environment cannot sign, install or verify an iPhone build. Do not list an IPA in Strata until the artifact is real, inspected and installed successfully.

## Privacy and storage
See `docs/PRIVACY.md`. The app has no analytics or automatic network calls. Device-local web storage is **not application-encrypted**, may be backed up by the OS and is lost when app data is cleared. Backups are plain JSON. Do not store passwords, medical records or other sensitive content. User memory is editable by deletion and re-entry, not model training. Memory does not sync automatically.

## Store copy
Draft listing language is in `docs/STORE_LISTING.md`. It describes implemented capabilities and distinguishes optional server connection from offline planning. Store submission requires the release checklist, real device screenshots, actual policy/privacy answers and owner review. Product name and trademarks have not been cleared.
