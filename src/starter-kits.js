// Bundled original guidance, available without downloads, accounts or inference.
export const planningKits = {
  general: {
    title: "Simple next steps",
    steps: [
      "Define the outcome and constraints",
      "Choose the next concrete step",
      "Review progress and adjust",
    ],
  },
  weekly: {
    title: "Weekly reset",
    steps: [
      "Capture unfinished tasks in one list",
      "Choose three outcomes that matter this week",
      "Break the first outcome into one small next step",
      "Check deadlines and commitments yourself",
      "Leave room for rest and unexpected work",
      "Review what worked at the end of the week",
    ],
  },
  trip: {
    title: "Trip preparation",
    steps: [
      "Confirm dates, destination and budget",
      "Check required travel documents and entry rules using official sources",
      "Review transport and accommodation confirmations",
      "Create a packing list for weather and activities",
      "Save important confirmations somewhere accessible offline",
      "Share your itinerary only with people you choose",
    ],
  },
  focus: {
    title: "Focus session",
    steps: [
      "Choose one concrete outcome",
      "Define a small stopping point",
      "Remove avoidable distractions",
      "Work on the first step for a manageable interval",
      "Record what remains and take a break",
    ],
  },
  project: {
    title: "Start a project",
    steps: [
      "Write the problem and who it helps",
      "Define a small first deliverable",
      "List assumptions and open questions",
      "Identify dependencies and people to consult",
      "Choose a next action and review date",
      "Review evidence before expanding scope",
    ],
  },
  meals: {
    title: "Meal planning",
    steps: [
      "Check ingredients already at home",
      "Choose meals that fit your preferences and schedule",
      "Build a shopping list from missing ingredients",
      "Plan preparation time and safe storage",
      "Review leftovers before buying more",
    ],
  },
  home: {
    title: "Home reset",
    steps: [
      "Choose one small area to finish",
      "Gather supplies you already own",
      "Sort items into keep, relocate and review",
      "Clean the cleared surface",
      "Return essentials to easy-to-reach places",
      "Review unwanted items before discarding anything",
    ],
  },
};
export const promptKits = [
  {
    id: "message",
    title: "Draft a message",
    prompt:
      "Help me draft a clear, friendly message. Recipient: [who]. Goal: [what I want to say]. Key details: [details]. Do not add promises or facts I did not provide.",
  },
  {
    id: "summary",
    title: "Summarize text",
    prompt:
      "Summarize the following text in five bullets and list any open questions. Use only the supplied text: [paste text]",
  },
  {
    id: "decision",
    title: "Compare options",
    prompt:
      "Help me compare these options: [options]. My priorities: [priorities]. Known facts: [facts]. Separate facts from assumptions and suggest what I should verify.",
  },
  {
    id: "plan",
    title: "Break down a goal",
    prompt:
      "Help turn this goal into five realistic next steps: [goal]. Constraints: [time, resources]. Ask for missing details rather than inventing them.",
  },
  {
    id: "learn",
    title: "Explain simply",
    prompt:
      "Explain [topic] in plain language, give a practical example, and suggest two questions I can use to check my understanding.",
  },
  {
    id: "rewrite",
    title: "Improve my writing",
    prompt:
      "Rewrite the following for clarity while preserving my meaning and avoiding new claims or commitments: [paste draft]",
  },
];
export function stepsForKit(id = "general") {
  if (!Object.hasOwn(planningKits, id))
    throw Error("Choose a built-in planning kit.");
  return planningKits[id].steps;
}
