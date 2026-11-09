# Release gates

This project is an initial working implementation, not a completed end-to-end store release.

- [ ] Core and UI test suites green from a clean checkout
- [ ] Dependency audit reviewed and material vulnerabilities resolved
- [ ] Native Android compile, lint, automated tests and physical tablet installation
- [ ] Native iOS compile, simulator/device testing and signed archive validation
- [ ] Backup export/import tested on both native WebViews (browser download behavior may differ)
- [ ] Real model server request tested on both platforms, including CORS and failure cases
- [ ] Accessibility, font scaling, VoiceOver/TalkBack, safe area and keyboard checks
- [ ] Final app icons, launch screens and genuine screenshots
- [ ] App storage recovery, deletion and OS backup behavior verified
- [ ] Publisher-owned bundle/application IDs, signing and store accounts
- [ ] Public privacy/support URLs and accurate store privacy questionnaires
- [ ] App Store/Play policy review, especially minimum functionality and AI output reporting
- [ ] Strata catalog entry only after real signed iPhone artifact is verified; Android distributed separately

Do not publish placeholders as installable builds. CI-produced unsigned or debug artifacts are not store-approved releases. Installation on the user's tablet requires a verified authorized ADB/device route.
