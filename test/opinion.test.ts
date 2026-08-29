import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAdvocate, parseJudge, GROUND_MAX_CHARS } from "../src/opinion.ts";

const advocate = { position: "justified", reasons: ["one reason", "two reason"] };
const judge = {
  verdict: "not justified",
  reasons: ["one reason", "two reason"],
  controlling_ground: "the less harmful means limb decided it",
};

test("a well shaped advocate answer parses", () => {
  const parsed = parseAdvocate(JSON.stringify(advocate));
  assert.equal(parsed.ok, true);
});

test("a well shaped judge answer parses", () => {
  const parsed = parseJudge(JSON.stringify(judge));
  assert.equal(parsed.ok, true);
});

test("prose is malformed however confidently it answers", () => {
  const prose = "Having weighed the submissions, I find the killing was justified.";
  assert.equal(parseJudge(prose).ok, false);
  assert.equal(parseAdvocate(prose).ok, false);
});

test("a verdict outside the two values is malformed", () => {
  assert.equal(parseJudge(JSON.stringify({ ...judge, verdict: "partly justified" })).ok, false);
  assert.equal(parseAdvocate(JSON.stringify({ ...advocate, position: "guilty" })).ok, false);
});

test("one reason is not enough", () => {
  assert.equal(parseJudge(JSON.stringify({ ...judge, reasons: ["only one"] })).ok, false);
  assert.equal(parseAdvocate(JSON.stringify({ ...advocate, reasons: ["only one"] })).ok, false);
});

test("an empty reason is not a reason", () => {
  assert.equal(parseJudge(JSON.stringify({ ...judge, reasons: ["one", "   "] })).ok, false);
});

test("a judge without its controlling ground is malformed", () => {
  const { controlling_ground, ...without } = judge;
  assert.equal(parseJudge(JSON.stringify(without)).ok, false);
  assert.equal(parseJudge(JSON.stringify({ ...judge, controlling_ground: " " })).ok, false);
});

test("the controlling ground is checked for length and not for wording", () => {
  const long = { ...judge, controlling_ground: "x".repeat(GROUND_MAX_CHARS + 1) };
  assert.equal(parseJudge(JSON.stringify(long)).ok, false);
  const odd = { ...judge, controlling_ground: "because I say so" };
  assert.equal(parseJudge(JSON.stringify(odd)).ok, true);
});

test("a judge answer in an advocate's shape is malformed, and the reverse", () => {
  assert.equal(parseJudge(JSON.stringify(advocate)).ok, false);
  assert.equal(parseAdvocate(JSON.stringify(judge)).ok, false);
});

test("a fenced JSON answer is malformed rather than repaired", () => {
  assert.equal(parseAdvocate("```json\n" + JSON.stringify(advocate) + "\n```").ok, false);
});
