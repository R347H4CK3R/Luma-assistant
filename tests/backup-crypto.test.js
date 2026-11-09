import test from "node:test";
import assert from "node:assert/strict";
import { createState, addMemory } from "../src/core.js";
import {
  encryptBackup,
  decryptBackup,
  isEncryptedBackup,
} from "../src/backup-crypto.js";
test("encrypted backup round-trips exact memories and hides plaintext", async () => {
  const state = addMemory(createState(), "A very private idea");
  const raw = await encryptBackup(state, "correct horse battery");
  assert.ok(isEncryptedBackup(raw));
  assert.ok(!raw.includes("A very private idea"));
  assert.deepEqual(await decryptBackup(raw, "correct horse battery"), state);
});
test("wrong password and altered ciphertext reject without returning state", async () => {
  const raw = await encryptBackup(createState(), "correct horse battery");
  await assert.rejects(decryptBackup(raw, "wrong password here"), /decrypt/);
  const e = JSON.parse(raw);
  e.data = (e.data[0] === "A" ? "B" : "A") + e.data.slice(1);
  await assert.rejects(
    decryptBackup(JSON.stringify(e), "correct horse battery"),
    /decrypt/,
  );
});
test("weak password and hostile envelope work factors are rejected", async () => {
  await assert.rejects(encryptBackup(createState(), "short"), /12/);
  const raw = await encryptBackup(createState(), "correct horse battery");
  const e = JSON.parse(raw);
  e.kdf.iterations = 999999999;
  await assert.rejects(
    decryptBackup(JSON.stringify(e), "correct horse battery"),
    /format/,
  );
});
test("legacy plain backup is not misidentified; oversized input rejects", async () => {
  assert.equal(isEncryptedBackup(JSON.stringify(createState())), false);
  await assert.rejects(
    decryptBackup("a".repeat(3000001), "correct horse battery"),
    /large/,
  );
});
test("large valid UTF8 backups remain decryptable", async () => {
  const state = createState();
  state.memories = Array.from({ length: 200 }, (_, i) => ({
    id: String(i),
    created: "2026-01-01",
    text: "界".repeat(2000),
  }));
  const raw = await encryptBackup(state, "correct horse battery");
  assert.deepEqual(await decryptBackup(raw, "correct horse battery"), state);
});
