import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { advocatePrompt, judgePrompt, renderSubmissions } from "../src/prompt.ts";
import type { ChargeSheet } from "../src/charge-sheet.ts";

const canonical = JSON.parse(
  readFileSync(new URL("./fixtures/t001.json", import.meta.url), "utf8"),
) as ChargeSheet;

const submissions = [
  { seat: "defence" as const, position: "justified" as const, reasons: ["a", "b"] },
  { seat: "defence" as const, position: "not justified" as const, reasons: ["c", "d"] },
  { seat: "prosecution" as const, position: "not justified" as const, reasons: ["e", "f"] },
  { seat: "prosecution" as const, position: "justified" as const, reasons: ["g", "h"] },
];

test("every advocate prompt begins with the same shared block", () => {
  const prompts = (["jon", "tyrion", "daenerys", "grey_worm"] as const).map((a) =>
    advocatePrompt(a, canonical),
  );
  const shared = prompts[0]!.split("\n\n---\n\n")[0]!;
  for (const prompt of prompts) assert.ok(prompt.startsWith(shared));
});

test("every judge prompt begins with the same shared block", () => {
  const prompts = (["barak", "elon", "shamgar"] as const).map((a) =>
    judgePrompt(a, canonical, submissions),
  );
  const shared = prompts[0]!.split("\n\n---\n\n")[0]!;
  for (const prompt of prompts) assert.ok(prompt.startsWith(shared));
});

test("an advocate is told its own character and no other", () => {
  const jon = advocatePrompt("jon", canonical);
  assert.ok(jon.includes("You are Jon Snow"));
  assert.ok(!jon.includes("You are Tyrion Lannister"));
  assert.ok(!jon.includes("Grey Worm is terse"));
});

test("submissions reach a judge by seat and never by name", () => {
  // The names appear in the charge sheet itself — Tyrion is in the agreed facts —
  // and that is the case record, not attribution. What is withheld is which
  // representative filed which submission.
  const rendered = renderSubmissions(submissions);
  assert.ok(rendered.includes("defence seat"));
  assert.ok(rendered.includes("prosecution seat"));
  for (const name of ["Jon", "Tyrion", "Daenerys", "Grey Worm"]) {
    assert.ok(!rendered.includes(name), `${name} must not appear in a submission`);
  }

  const prompt = judgePrompt("barak", canonical, submissions);
  const submissionsBlock = prompt.split("SUBMISSIONS FROM THE REPRESENTATIVES")[1]!.split("\n\n---\n\n")[0]!;
  for (const name of ["Jon", "Tyrion", "Daenerys", "Grey Worm"]) {
    assert.ok(!submissionsBlock.includes(name), `${name} must not appear beside a submission`);
  }
});

test("a judge is shown the position each submission reached", () => {
  const rendered = renderSubmissions(submissions);
  assert.equal((rendered.match(/position: justified/g) ?? []).length, 2);
  assert.equal((rendered.match(/position: not justified/g) ?? []).length, 2);
});

test("the charge sheet is in every prompt, and its facts are numbered", () => {
  for (const prompt of [advocatePrompt("tyrion", canonical), judgePrompt("elon", canonical, submissions)]) {
    assert.ok(prompt.includes(canonical.question));
    assert.ok(prompt.includes(`1. ${canonical.agreed_facts[0]}`));
  }
});

test("the simulation rule reaches every advocate", () => {
  for (const agent of ["jon", "tyrion", "daenerys", "grey_worm"] as const) {
    assert.ok(advocatePrompt(agent, canonical).includes("does not\nfix an opinion"));
  }
});
