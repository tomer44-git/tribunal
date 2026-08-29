import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runAdvocateWave, SEQ_OF_ADVOCATE, type Deps } from "../src/wave.ts";
import { CallFailed, type CallResult } from "../src/openrouter.ts";
import type { Config } from "../src/config.ts";
import type { CallRow } from "../src/store.ts";
import type { ChargeSheet } from "../src/charge-sheet.ts";

const sheet = JSON.parse(
  readFileSync(new URL("./fixtures/t001.json", import.meta.url), "utf8"),
) as ChargeSheet;

const config = {
  models: {
    jon: "m/jon",
    tyrion: "m/tyrion",
    daenerys: "m/daenerys",
    grey_worm: "m/grey",
    barak: "m/barak",
    elon: "m/elon",
    shamgar: "m/shamgar",
  },
} as Config;

const prices = new Map([["m/answered", { inPerMillion: 1, outPerMillion: 10 }]]);

const answer = (position: string, reasons = ["one reason", "two reason"]): CallResult => ({
  modelAnswered: "m/answered",
  content: JSON.stringify({ position, reasons }),
  tokensIn: 1000,
  tokensOut: 100,
  latencyMs: 7,
  raw: "{}",
});

const deps = (
  call: Deps["call"],
): { deps: Deps; rows: CallRow[] } => {
  const rows: CallRow[] = [];
  return {
    rows,
    deps: {
      call,
      prices: async () => prices,
      writeCall: async (row) => {
        rows.push(row);
        return null;
      },
    },
  };
};

test("four advocates make four calls and write four rows", async () => {
  const { deps: d, rows } = deps(async () => answer("justified"));
  const results = await runAdvocateWave(config, "run-1", sheet, d);
  assert.equal(results.length, 4);
  assert.equal(rows.length, 4);
  assert.deepEqual(
    rows.map((r) => r.seq).sort(),
    [1, 2, 3, 4],
  );
  assert.ok(rows.every((r) => r.role === "advocate" && r.verdict === null));
});

test("each advocate is asked for on its own model", async () => {
  const asked: string[] = [];
  const { deps: d } = deps(async ({ model }) => {
    asked.push(model);
    return answer("justified");
  });
  await runAdvocateWave(config, "run-1", sheet, d);
  assert.deepEqual(asked.sort(), ["m/daenerys", "m/grey", "m/jon", "m/tyrion"]);
});

test("a seat does not fix a position", async () => {
  // The defence seat returning "not justified" is the simulation rule working,
  // not an error, and nothing in the wave may treat it as one.
  const { deps: d } = deps(async ({ model }) =>
    answer(model === "m/jon" ? "not justified" : "justified"),
  );
  const results = await runAdvocateWave(config, "run-1", sheet, d);
  const jon = results.find((r) => r.agent === "jon")!;
  assert.equal(jon.seat, "defence");
  assert.equal(jon.status, "complete");
  assert.equal(jon.submission?.position, "not justified");
});

test("a malformed answer leaves no position behind", async () => {
  const { deps: d, rows } = deps(async ({ model }) =>
    model === "m/tyrion"
      ? { ...answer("justified"), content: "I think it was justified, on balance." }
      : answer("justified"),
  );
  const results = await runAdvocateWave(config, "run-1", sheet, d);
  const tyrion = results.find((r) => r.agent === "tyrion")!;
  assert.equal(tyrion.status, "malformed");
  assert.equal(tyrion.submission, null);
  const row = rows.find((r) => r.seq === SEQ_OF_ADVOCATE.tyrion)!;
  assert.equal(row.position, null);
  assert.equal(row.reasons, null);
  assert.ok(row.raw_response !== null, "the text that arrived is kept");
});

test("a failed call is still a row, and the other three are unaffected", async () => {
  const { deps: d, rows } = deps(async ({ model }) => {
    if (model === "m/grey") throw new CallFailed("the provider answered 429", 12, "slow down");
    return answer("justified");
  });
  const results = await runAdvocateWave(config, "run-1", sheet, d);
  assert.equal(rows.length, 4);
  const grey = results.find((r) => r.agent === "grey_worm")!;
  assert.equal(grey.status, "failed");
  assert.equal(grey.row.position, null);
  assert.equal(grey.row.model_answered, null);
  assert.equal(grey.row.error, "the provider answered 429");
  assert.equal(results.filter((r) => r.status === "complete").length, 3);
});

test("tokens are kept apart and the cost is worked out from the model that answered", async () => {
  const { deps: d, rows } = deps(async () => answer("justified"));
  await runAdvocateWave(config, "run-1", sheet, d);
  for (const row of rows) {
    assert.equal(row.tokens_in, 1000);
    assert.equal(row.tokens_out, 100);
    assert.equal(row.price_in_per_m, 1);
    assert.equal(row.price_out_per_m, 10);
    assert.ok(Math.abs(row.cost_usd! - (1000 * 1 + 100 * 10) / 1e6) < 1e-12);
  }
});

test("no advocate row can carry a judge's fields", async () => {
  const { deps: d, rows } = deps(async () => answer("justified"));
  await runAdvocateWave(config, "run-1", sheet, d);
  assert.ok(rows.every((r) => r.verdict === null && r.controlling_ground === null));
});

test("the four go out together rather than one after another", async () => {
  let inFlight = 0;
  let peak = 0;
  const { deps: d } = deps(async () => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    return answer("justified");
  });
  await runAdvocateWave(config, "run-1", sheet, d);
  assert.equal(peak, 4);
});
