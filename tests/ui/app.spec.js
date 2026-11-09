import { test, expect } from "@playwright/test";
test("mobile memories persist, search and forget; checklist completes", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Memory", exact: true }).click();
  await page.getByLabel("Something to remember").fill("Vegetarian lunches");
  await page.getByRole("button", { name: "Save memory" }).click();
  await expect(page.getByText("Vegetarian lunches")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Memory", exact: true }).click();
  await expect(page.getByText("Vegetarian lunches")).toBeVisible();
  await page.getByLabel("Search your memory").fill("airport");
  await expect(
    page.getByText("No memories found.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Plan", exact: true }).click();
  await page.getByLabel("What are you working toward?").fill("Plan a trip");
  await page.getByRole("button", { name: "Create checklist" }).click();
  await page
    .getByRole("button", {
      name: "Complete Define the outcome and constraints",
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Reopen Define the outcome and constraints",
    }),
  ).toBeVisible();
});
test("untrusted imported IDs remain text, not HTML", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await page.evaluate(() =>
    localStorage.setItem(
      "luma.v1",
      JSON.stringify({
        version: 1,
        memories: [
          {
            id: '"><img src=x id=injected>',
            text: "safe note",
            created: "2026-01-01",
          },
        ],
        tasks: [],
      }),
    ),
  );
  await page.reload();
  await page.getByRole("button", { name: "Memory", exact: true }).click();
  await expect(page.locator("#injected")).toHaveCount(0);
  await expect(page.getByText("safe note")).toBeVisible();
});
test("today mobile screenshot", async ({ page }) => {
  await page.goto("http://127.0.0.1:4173");
  await page.screenshot({
    path: "docs/luma-mobile-preview.png",
    fullPage: true,
  });
});

test("local AI explains unsupported device without a server request", async ({
  page,
}) => {
  const outgoing = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:4173")) outgoing.push(r.url());
  });
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(
    page.getByText("Local AI requires a supported iPhone", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Generate on this iPhone" }),
  ).toBeDisabled();
  expect(outgoing).toEqual([]);
});
test("local context is explicitly opt-in and existing memories survive", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await page.evaluate(() =>
    localStorage.setItem(
      "luma.v1",
      JSON.stringify({
        version: 1,
        memories: [
          {
            id: "note-1",
            text: "I prefer a short walk",
            created: "2026-01-01",
          },
        ],
        tasks: [],
      }),
    ),
  );
  await page.reload();
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page.getByText("Review local context", { exact: true }).click();
  await expect(page.locator("#local-context")).not.toContainText("short walk");
  await page.getByLabel("Include up to 3 saved notes").check();
  await expect(page.locator("#local-context")).toContainText("short walk");
  await page.getByRole("button", { name: "Memory", exact: true }).click();
  await expect(page.getByText("I prefer a short walk")).toBeVisible();
});
async function mockNative(page, deferred = false) {
  await page.addInitScript(
    ({ deferred }) => {
      window.webkit = { messageHandlers: { bridge: {} } };
      window.localRequests = [];
      window.Capacitor = {
        PluginHeaders: [
          {
            name: "LocalAssistant",
            methods: ["availability", "generate", "cancel"].map((name) => ({
              name,
              rtype: "promise",
            })),
          },
        ],
        nativePromise: async (_plugin, method, options) => {
          if (method === "availability")
            return { available: true, reason: "available" };
          if (method === "cancel") return { cancelled: true };
          window.localRequests.push(options);
          if (deferred)
            return new Promise(
              (resolve) =>
                (window.finishLocal = () => resolve({ text: "late result" })),
            );
          return { text: "a".repeat(5000) };
        },
      };
    },
    { deferred },
  );
}
test("mocked native bridge requires review and editing before long answer save", async ({
  page,
}) => {
  await mockNative(page);
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page
    .getByLabel("What would you like help with?")
    .fill("Draft something");
  await page.getByRole("button", { name: "Generate on this iPhone" }).click();
  await expect(page.locator("#local-answer")).toHaveText("a".repeat(5000));
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("luma.v1") || '{"memories":[]}')
          .memories.length,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Review answer for memory" }).click();
  await expect(
    page.getByRole("button", { name: "Save note", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Answer excerpt to save")
    .fill("Reviewed short excerpt");
  await page.getByRole("button", { name: "Save note", exact: true }).click();
  await page.getByRole("button", { name: "Memory", exact: true }).click();
  await expect(page.getByText("Reviewed short excerpt")).toBeVisible();
  expect(await page.evaluate(() => window.localRequests[0].notes)).toEqual([]);
});
test("mocked native cancellation discards late result without erasing other drafts", async ({
  page,
}) => {
  await mockNative(page, true);
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await page.getByLabel("What would you like help with?").fill("Wait");
  await page.getByRole("button", { name: "Generate on this iPhone" }).click();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Memory", exact: true }).click();
  await page
    .getByLabel("Something to remember")
    .fill("Do not erase this draft");
  await page.evaluate(() => window.finishLocal());
  await expect(page.getByLabel("Something to remember")).toHaveValue(
    "Do not erase this draft",
  );
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.locator("#local-answer")).not.toContainText("late result");
  await expect(page.locator("#local-message")).toContainText("cancelled");
});
import { encryptBackup, decryptBackup } from "../../src/backup-crypto.js";
import fs from "node:fs/promises";
test("encrypted browser export and confirmed import preserve data", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Memory", exact: true }).click();
  await page.getByLabel("Something to remember").fill("Backup me securely");
  await page.getByRole("button", { name: "Save memory" }).click();
  await page.getByLabel("New backup passphrase").fill("correct horse battery");
  await page.getByLabel("Repeat passphrase").fill("correct horse battery");
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export encrypted backup", exact: true })
    .click();
  const download = await downloaded;
  const raw = await fs.readFile(await download.path(), "utf8");
  expect(raw).not.toContain("Backup me securely");
  expect(
    (await decryptBackup(raw, "correct horse battery")).memories[0].text,
  ).toBe("Backup me securely");
  await expect(page.getByLabel("New backup passphrase")).toHaveValue("");
  await page
    .locator("#file")
    .setInputFiles({
      name: "luma-backup.encrypted.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
  await page
    .getByLabel("Backup passphrase", { exact: true })
    .fill("wrong passphrase here");
  await page.getByRole("button", { name: "Decrypt and review" }).click();
  await expect(page.locator("#notice")).toContainText("Unable to decrypt");
  await expect(
    page.getByText("Backup me securely", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Backup passphrase", { exact: true })
    .fill("correct horse battery");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Decrypt and review" }).click();
  await expect(
    page.getByText("Backup me securely", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("#encrypted-import-form")).toBeHidden();
});
test("cancelled encrypted import never presents a late restore confirmation", async ({
  page,
}) => {
  const raw = await encryptBackup(
    { version: 1, memories: [], tasks: [] },
    "correct horse battery",
  );
  await page.addInitScript(() => {
    const derive = crypto.subtle.deriveKey.bind(crypto.subtle);
    crypto.subtle.deriveKey = (...args) =>
      new Promise((resolve, reject) => {
        window.releaseBackupKey = () => derive(...args).then(resolve, reject);
      });
  });
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: "Memory", exact: true }).click();
  await page
    .locator("#file")
    .setInputFiles({
      name: "backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(raw),
    });
  await page
    .getByLabel("Backup passphrase", { exact: true })
    .fill("correct horse battery");
  let dialogs = 0;
  page.on("dialog", (d) => {
    dialogs++;
    d.dismiss();
  });
  await page.getByRole("button", { name: "Decrypt and review" }).click();
  await page.waitForFunction(
    () => typeof window.releaseBackupKey === "function",
  );
  await page
    .getByRole("button", { name: "Cancel import", exact: true })
    .click();
  await page.evaluate(() => window.releaseBackupKey());
  await expect(
    page.getByRole("button", { name: "Import backup", exact: true }),
  ).toBeEnabled();
  expect(dialogs).toBe(0);
  await expect(page.locator("#encrypted-import-form")).toBeHidden();
});
test("bundled quick starts and planning kits need no model or account", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173");
  await page
    .getByRole("button", { name: "Draft a message", exact: true })
    .click();
  await expect(page.getByLabel("What would you like help with?")).toHaveValue(
    /Recipient:/,
  );
  await expect(
    page.getByRole("button", { name: "Generate on this iPhone" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Plan", exact: true }).click();
  await page.getByLabel("What are you working toward?").fill("My week");
  await page.getByLabel("Built-in planning kit").selectOption("weekly");
  await page.getByRole("button", { name: "Create checklist" }).click();
  await expect(
    page.getByText("Choose three outcomes that matter this week", {
      exact: true,
    }),
  ).toBeVisible();
});
