import test from "node:test";
import assert from "node:assert/strict";
import { planningKits, promptKits, stepsForKit } from "../src/starter-kits.js";
import { createState, planGoal } from "../src/core.js";
test("bundled kits are concrete, bounded offline data", () => {
  assert.ok(Object.keys(planningKits).length >= 6);
  assert.ok(promptKits.length >= 6);
  for (const kit of Object.values(planningKits)) {
    assert.ok(kit.steps.length >= 3 && kit.steps.length <= 8);
    assert.ok(kit.steps.every((s) => s.length < 400));
  }
  assert.throws(() => stepsForKit("unknown"));
});
test("user-selected kit becomes local tasks without changing memories", () => {
  const state = planGoal(createState(), "My week", "weekly");
  assert.deepEqual(
    state.tasks.map((t) => t.text),
    planningKits.weekly.steps,
  );
  assert.deepEqual(state.memories, []);
  assert.ok(state.tasks.every((t) => t.goal === "My week" && !t.done));
});
