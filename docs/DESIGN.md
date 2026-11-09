# Luma implementation direction
The user requested a third independent iOS/Android assistant and delegated design choices. Luma is deliberately separate from GhostAI/Veyra's developer/repository workflow. Its initial audience is someone who wants personal context and small actionable plans without a mandatory cloud account.

Implementation choice: Capacitor 7 with a shared accessible HTML/CSS/JavaScript interface. This minimizes divergence between mobile platforms and permits offline local features. Native Swift/Kotlin inference implementations would offer stronger device integration but require separate model runtime work. A cloud-only assistant would contradict the no-mandatory-cost requirement. These are builder choices, not claims that the user reviewed a detailed design.

Warm cream, sage and midnight colors, large editorial headlines, generous touch targets and four focused tabs form the visual direction. Functional boundaries remain visible: local templates are not AI, model calls are opt-in, no output executes tools, and memory is user-controlled local storage.

The first version implements capture/search, starter plans and a reviewed model connection. It does not imply every requested capability is complete. Future work must add encrypted native storage, real on-device inference with device eligibility checks, narrow permission-based integrations and audited action approval before broader autonomy.
