import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { checkChargeSheet } from "../src/charge-sheet.ts";

const compiled = new URL("../dist/shared/charge-sheet.js", import.meta.url);

const sheet = JSON.parse(
  readFileSync(new URL("./fixtures/t001.json", import.meta.url), "utf8"),
) as Record<string, unknown>;

const cases: Record<string, unknown>[] = [
  sheet,
  { ...sheet, question: "" },
  { ...sheet, agreed_facts: ["one only", "two only"] },
  { ...sheet, background: "too short" },
  { ...sheet, act_alleged: "he did it" },
  { agreed_facts: [] },
  {},
];

test("the browser and the server refuse the same sheets for the same reasons", async (t) => {
  if (!existsSync(compiled)) {
    t.skip("run npm run build first — the browser copy is emitted by the build");
    return;
  }
  const browser = (await import(compiled.href)) as { checkChargeSheet: typeof checkChargeSheet };
  for (const input of cases) {
    assert.deepEqual(
      browser.checkChargeSheet(input),
      checkChargeSheet(input),
      `the two copies disagreed about ${JSON.stringify(input).slice(0, 60)}`,
    );
  }
});
