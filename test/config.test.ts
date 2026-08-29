import { test } from "node:test";
import assert from "node:assert/strict";
import { readConfig, MissingConfig, AGENTS, SEAT_OF, MAX_CALLS_PER_DELIBERATION } from "../src/config.ts";

const complete: Record<string, string> = {
  SUPABASE_URL: "https://example.supabase.co/",
  SUPABASE_SECRET_KEY: "sb_secret_x",
  OPENROUTER_API_KEY: "sk-or-v1-x",
  MODEL_ADVOCATE_JON: "a/one",
  MODEL_ADVOCATE_TYRION: "a/two",
  MODEL_ADVOCATE_DAENERYS: "a/three",
  MODEL_ADVOCATE_GREY_WORM: "a/four",
  MODEL_JUDGE_BARAK: "b/one",
  MODEL_JUDGE_ELON: "b/two",
  MODEL_JUDGE_SHAMGAR: "b/three",
  MAX_USD_PER_DELIBERATION: "0.25",
};

test("a complete environment reads, and the trailing slash goes", () => {
  const config = readConfig(complete);
  assert.equal(config.supabaseUrl, "https://example.supabase.co");
  assert.equal(config.maxUsdPerDeliberation, 0.25);
  for (const agent of AGENTS) assert.ok(config.models[agent].length > 0);
});

test("every missing name is reported, not the first", () => {
  try {
    readConfig({ ...complete, SUPABASE_URL: "", MODEL_JUDGE_ELON: "" });
    assert.fail("expected it to refuse");
  } catch (error) {
    assert.ok(error instanceof MissingConfig);
    assert.deepEqual(error.names.sort(), ["MODEL_JUDGE_ELON", "SUPABASE_URL"]);
  }
});

test("a spend cap that is not a positive number is missing, not zero", () => {
  for (const cap of ["", "0", "-1", "none"]) {
    assert.throws(() => readConfig({ ...complete, MAX_USD_PER_DELIBERATION: cap }), MissingConfig);
  }
});

test("the seating plan is two seats of two, and the cap is eight", () => {
  const seats = Object.values(SEAT_OF);
  assert.equal(seats.filter((s) => s === "defence").length, 2);
  assert.equal(seats.filter((s) => s === "prosecution").length, 2);
  assert.equal(MAX_CALLS_PER_DELIBERATION, 8);
});
