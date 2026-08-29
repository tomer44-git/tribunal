import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { handleSubmission, generateReference, type Stored } from "../src/submit.ts";
import type { ChargeSheet } from "../src/charge-sheet.ts";

const canonical = JSON.parse(
  readFileSync(new URL("./fixtures/t001.json", import.meta.url), "utf8"),
) as ChargeSheet & { reference: string };

/** A store that records what it was asked to write and never fails. */
const recorder = () => {
  const written: { sheet: ChargeSheet; reference: string }[] = [];
  const store = async (sheet: ChargeSheet, reference: string): Promise<Stored> => {
    written.push({ sheet, reference });
    return { id: "00000000-0000-0000-0000-000000000001", reference };
  };
  return { written, store };
};

const refuse = async (): Promise<Stored> => {
  throw new Error("the store must not be reached");
};

test("a sound charge sheet is stored and its id comes back", async () => {
  const { written, store } = recorder();
  const outcome = await handleSubmission(canonical, store);
  assert.equal(outcome.status, 201);
  assert.equal(written.length, 1);
  assert.equal(written[0]!.reference, "T-001");
});

test("a refused charge sheet never reaches the store", async () => {
  const outcome = await handleSubmission({ ...canonical, question: "" }, refuse);
  assert.equal(outcome.status, 422);
});

test("a refusal names every failing field", async () => {
  const outcome = await handleSubmission({ agreed_facts: [] }, refuse);
  assert.equal(outcome.status, 422);
  const fields = outcome.status === 422 ? outcome.body.problems.map((p) => p.field) : [];
  for (const expected of ["question", "accused", "act_alleged", "background", "agreed_facts"]) {
    assert.ok(fields.includes(expected as never), `expected ${expected} to be named`);
  }
});

test("a body that is not an object is refused before anything else", async () => {
  for (const body of [null, undefined, "a charge sheet", 7, [canonical]]) {
    const outcome = await handleSubmission(body, refuse);
    assert.equal(outcome.status, 400);
  }
});

test("a sheet without a reference is given one", async () => {
  const { written, store } = recorder();
  const { reference, ...withoutReference } = canonical;
  const outcome = await handleSubmission(withoutReference, store);
  assert.equal(outcome.status, 201);
  assert.match(written[0]!.reference, /^C-[0-9A-F]{6}$/);
});

test("an unusable reference is refused and nothing is written", async () => {
  const outcome = await handleSubmission({ ...canonical, reference: "a reference/../.." }, refuse);
  assert.equal(outcome.status, 400);
});

test("only the fields of a charge sheet are written", async () => {
  const { written, store } = recorder();
  await handleSubmission({ ...canonical, id: "smuggled", created_at: "1999-01-01" }, store);
  assert.deepEqual(Object.keys(written[0]!.sheet).sort(), [
    "accused",
    "act_alleged",
    "agreed_facts",
    "background",
    "deceased",
    "question",
  ]);
});

test("a generated reference is stable in shape", () => {
  assert.match(generateReference(() => 0), /^C-000000$/);
  assert.match(generateReference(() => 0.999999), /^C-[0-9A-F]{6}$/);
});
