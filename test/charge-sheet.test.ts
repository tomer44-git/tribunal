import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkChargeSheet, LIMITS, type ChargeSheet } from "../src/charge-sheet.ts";

const canonical = JSON.parse(
  readFileSync(new URL("./fixtures/t001.json", import.meta.url), "utf8"),
) as ChargeSheet;

/** A sound sheet, with one field replaced. */
const withField = (field: keyof ChargeSheet, value: unknown): unknown => ({
  ...canonical,
  [field]: value,
});

const fieldsRefused = (input: unknown): string[] =>
  checkChargeSheet(input).map((p) => p.field);

test("the canonical charge sheet passes every rule", () => {
  assert.deepEqual(checkChargeSheet(canonical), []);
});

test("a sheet without its question is refused", () => {
  assert.ok(fieldsRefused(withField("question", "")).includes("question"));
  const { question, ...withoutQuestion } = canonical;
  assert.ok(fieldsRefused(withoutQuestion).includes("question"));
});

test("a question that is really two questions is refused", () => {
  assert.ok(
    fieldsRefused(withField("question", "Was it justified? Or was it not?")).includes("question"),
  );
});

test("a question that does not end in a question mark is refused", () => {
  assert.ok(fieldsRefused(withField("question", "Whether it was justified.")).includes("question"));
});

test("an act alleged shorter than the floor is refused", () => {
  assert.ok(fieldsRefused(withField("act_alleged", "Jon killed her.")).includes("act_alleged"));
});

test("an act alleged that does not name the accused is refused", () => {
  const act = "Someone else entirely did the thing that is complained of here today.";
  assert.ok(fieldsRefused(withField("act_alleged", act)).includes("act_alleged"));
});

test("part of the accused's name is enough to name them", () => {
  // T-001 accuses Jon Snow of an act that names only Jon.
  assert.deepEqual(checkChargeSheet(canonical), []);
});

test("a background outside the range is refused at both ends", () => {
  const short = "word ".repeat(LIMITS.backgroundMinWords - 1);
  const long = "word ".repeat(LIMITS.backgroundMaxWords + 1);
  assert.ok(fieldsRefused(withField("background", short)).includes("background"));
  assert.ok(fieldsRefused(withField("background", long)).includes("background"));
});

test("fewer than three agreed facts is refused", () => {
  assert.ok(
    fieldsRefused(withField("agreed_facts", canonical.agreed_facts.slice(0, 2))).includes(
      "agreed_facts",
    ),
  );
});

test("an agreed fact under the word floor is refused", () => {
  assert.ok(
    fieldsRefused(withField("agreed_facts", [...canonical.agreed_facts, "It happened."])).includes(
      "agreed_facts",
    ),
  );
});

test("two identical agreed facts are refused", () => {
  const first = canonical.agreed_facts[0]!;
  assert.ok(
    fieldsRefused(withField("agreed_facts", [...canonical.agreed_facts, first])).includes(
      "agreed_facts",
    ),
  );
});

test("the deceased may be absent", () => {
  assert.deepEqual(checkChargeSheet(withField("deceased", null)), []);
});

test("a refusal names every failing field, not the first", () => {
  const fields = fieldsRefused({ agreed_facts: [] });
  for (const expected of ["question", "accused", "act_alleged", "background", "agreed_facts"]) {
    assert.ok(fields.includes(expected as never), `expected ${expected} to be named`);
  }
});

test("nothing at all is refused rather than thrown", () => {
  assert.ok(checkChargeSheet(undefined).length > 0);
  assert.ok(checkChargeSheet(null).length > 0);
  assert.ok(checkChargeSheet("a charge sheet").length > 0);
});
