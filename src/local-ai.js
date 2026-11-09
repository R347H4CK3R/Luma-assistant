// No network transport exists here. An unavailable model never falls back to cloud.
export function buildLocalPrompt(state, question, includeMemory = false) {
  if (
    typeof question !== "string" ||
    !question.trim() ||
    question.length > 2000
  ) {
    throw Error("Enter a question between 1 and 2,000 characters.");
  }
  return {
    question: question.trim(),
    notes: includeMemory
      ? state.memories.slice(0, 3).map((note) => note.text.slice(0, 500))
      : [],
  };
}
export function createLocalAssistant(native) {
  let active = null;
  return {
    async availability() {
      if (!native)
        return {
          available: false,
          reason:
            "Local AI requires a supported iPhone with iOS 26 and Apple Intelligence enabled. Local notes and checklists still work here.",
        };
      try {
        const status = await native.availability();
        const reasons = {
          available: "Ready. Apple’s local model is available on this iPhone.",
          ios_26_required:
            "Local AI requires iOS 26 or later. Notes and checklists still work.",
          framework_unavailable:
            "This build cannot access Apple’s local model. Notes and checklists still work.",
          device_not_eligible:
            "This device does not support Apple Intelligence. Notes and checklists still work.",
          apple_intelligence_disabled:
            "Enable Apple Intelligence in iPhone Settings to use local AI.",
          model_not_ready:
            "The system model is not ready. Complete Apple Intelligence setup/downloads in Settings, then check again.",
          unavailable:
            "The system model is currently unavailable. Language, region or device settings may affect availability.",
        };
        return {
          available: status?.available === true,
          reason: reasons[status?.reason] || reasons.unavailable,
        };
      } catch {
        return {
          available: false,
          reason:
            "The local model could not be checked. Try again; no cloud request was made.",
        };
      }
    },
    async generate(request) {
      if (!native)
        throw Error(
          "Local AI requires a supported iPhone. No cloud request was made.",
        );
      if (active) throw Error("An answer is already being generated.");
      const token = {};
      active = token;
      try {
        const result = await native.generate(request);
        if (active !== token) throw Error("Request cancelled.");
        if (typeof result?.text !== "string" || !result.text.trim())
          throw Error("The local model did not return a valid answer.");
        return result.text;
      } finally {
        if (active === token) active = null;
      }
    },
    async cancel() {
      if (!active || !native) return;
      active = null;
      await native.cancel();
    },
  };
}
export function answerNoteState(answer) {
  return {
    draft: answer,
    canSave:
      typeof answer === "string" && !!answer.trim() && answer.length <= 4000,
    message:
      answer.length > 4000
        ? "This answer exceeds 4,000 characters. Edit an excerpt below before saving; the full answer stays above."
        : "Review or edit this excerpt. Nothing is saved until you choose Save note.",
  };
}
