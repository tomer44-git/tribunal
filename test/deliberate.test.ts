import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { deliberate, RETRY_SEQ, RETRY_PAUSE_MS } from "../src/deliberate.ts";
import { CallFailed, type CallResult } from "../src/openrouter.ts";
import { MAX_CALLS_PER_DELIBERATION, type Config } from "../src/config.ts";
import type { CallRow } from "../src/store.ts";
import type { ChargeSheet } from "../src/charge-sheet.ts";

const sheet = JSON.parse(
  readFileSync(new URL("./fixtures/t001.json", import.meta.url), "utf8"),
) as ChargeSheet;

const config = {
  maxUsdPerDeliberation: 0.25,
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

const JUDGE_MODELS = ["m/barak", "m/elon", "m/shamgar"];

const good = (model: string): CallResult => ({
  modelAnswered: model,
  content: JUDGE_MODELS.includes(model)
    ? JSON.stringify({ verdict: "justified", reasons: ["a", "b"], controlling_ground: "a ground" })
    : JSON.stringify({ position: "justified", reasons: ["a", "b"] }),
  tokensIn: 100,
  tokensOut: 10,
  costUsd: 0.001,
  costIn: 0.0005,
  costOut: 0.0005,
  latencyMs: 3,
  raw: "{}",
});

const prose = (model: string): CallResult => ({ ...good(model), content: "It was justified." });

/** Answers scripted per model, with a count of how many times each was called. */
const panel = (script: (model: string, attempt: number) => "good" | "prose" | "throw") => {
  const rows: CallRow[] = [];
  const attempts = new Map<string, number>();
  return {
    rows,
    attempts,
    deps: {
      call: async ({ model }: { model: string }) => {
        const attempt = (attempts.get(model) ?? 0) + 1;
        attempts.set(model, attempt);
        const outcome = script(model, attempt);
        if (outcome === "throw") throw new CallFailed("the provider answered 503", 2, "");
        return outcome === "prose" ? prose(model) : good(model);
      },
      prices: async () => new Map(),
      retryPauseMs: 0,
      writeCall: async (row: CallRow) => {
        rows.push(row);
        return null;
      },
    },
  };
};

test("a clean run is seven calls, three opinions and no retry", async () => {
  const { deps, rows } = panel(() => "good");
  const run = await deliberate(config, "run", sheet, deps);
  assert.equal(run.status, "complete");
  assert.equal(run.retryUsed, false);
  assert.equal(rows.length, 7);
  assert.equal(run.judges.filter((j) => j.status === "complete").length, 3);
  assert.ok(rows.every((r) => r.is_retry === false));
});

test("a malformed advocate claims the spare and the run goes on", async () => {
  const { deps, rows } = panel((model, attempt) =>
    model === "m/tyrion" && attempt === 1 ? "prose" : "good",
  );
  const run = await deliberate(config, "run", sheet, deps);
  assert.equal(run.status, "complete");
  assert.equal(run.retryUsed, true);
  assert.equal(rows.length, 8);
  const retry = rows.find((r) => r.is_retry)!;
  assert.equal(retry.seq, RETRY_SEQ);
  assert.equal(retry.agent, "tyrion");
});

test("an advocate that fails twice stops the run before the judges", async () => {
  const { deps, rows } = panel((model) => (model === "m/grey" ? "throw" : "good"));
  const run = await deliberate(config, "run", sheet, deps);
  assert.equal(run.status, "failed");
  assert.equal(run.failedAtWave, "advocates");
  assert.deepEqual(run.failedAdvocates, ["grey_worm"]);
  assert.equal(run.judges.length, 0);
  assert.ok(!rows.some((r) => r.role === "judge"), "no judge was called");
  assert.equal(rows.length, 5);
});

test("two failing advocates share one spare, and the second has none", async () => {
  const { deps, rows, attempts } = panel((model) =>
    model === "m/jon" || model === "m/daenerys" ? "throw" : "good",
  );
  const run = await deliberate(config, "run", sheet, deps);
  assert.equal(run.status, "failed");
  assert.deepEqual(run.failedAdvocates, ["jon", "daenerys"]);
  // The spare went to the first in a fixed order, and daenerys never got one.
  assert.equal(attempts.get("m/jon"), 2);
  assert.equal(attempts.get("m/daenerys"), 1);
  assert.equal(rows.filter((r) => r.is_retry).length, 1);
});

test("a judge that fails leaves the other two standing and the run incomplete", async () => {
  const { deps } = panel((model, attempt) =>
    model === "m/shamgar" && attempt <= 2 ? "throw" : "good",
  );
  const run = await deliberate(config, "run", sheet, deps);
  assert.equal(run.status, "failed");
  assert.equal(run.failedAtWave, "judges");
  assert.equal(run.judges.filter((j) => j.status === "complete").length, 2);
  const shamgar = run.judges.find((j) => j.agent === "shamgar")!;
  assert.equal(shamgar.row.verdict, null);
  assert.equal(shamgar.row.reasons, null);
});

test("a judge retry that succeeds makes the run complete", async () => {
  const { deps, rows } = panel((model, attempt) =>
    model === "m/elon" && attempt === 1 ? "prose" : "good",
  );
  const run = await deliberate(config, "run", sheet, deps);
  assert.equal(run.status, "complete");
  assert.equal(run.retryUsed, true);
  assert.equal(rows.length, 8);
  assert.equal(rows.find((r) => r.is_retry)!.agent, "elon");
});

test("a spare spent on an advocate is not available to a judge", async () => {
  const { deps, rows, attempts } = panel((model, attempt) => {
    if (model === "m/jon" && attempt === 1) return "prose";
    if (model === "m/barak") return "prose";
    return "good";
  });
  const run = await deliberate(config, "run", sheet, deps);
  assert.equal(run.status, "failed");
  assert.equal(run.failedAtWave, "judges");
  assert.equal(attempts.get("m/barak"), 1, "barak got no second ask");
  assert.equal(rows.filter((r) => r.is_retry).length, 1);
  assert.equal(rows.length, 8);
});

test("no run ever makes more than eight calls", async () => {
  for (const script of [
    () => "throw" as const,
    () => "prose" as const,
    (model: string) => (model === "m/jon" ? ("throw" as const) : ("good" as const)),
  ]) {
    const { deps, rows } = panel(script);
    await deliberate(config, "run", sheet, deps);
    assert.ok(rows.length <= MAX_CALLS_PER_DELIBERATION, `${rows.length} calls`);
  }
});

test("nothing that failed or was malformed carries an outcome", async () => {
  const { deps, rows } = panel((model, attempt) =>
    model === "m/elon" && attempt === 1 ? "prose" : model === "m/shamgar" ? "throw" : "good",
  );
  await deliberate(config, "run", sheet, deps);
  for (const row of rows.filter((r) => r.status !== "complete")) {
    assert.equal(row.position, null);
    assert.equal(row.verdict, null);
    assert.equal(row.controlling_ground, null);
  }
});

test("a run stops before the judges if the advocates alone reach the spend cap", async () => {
  const tight = { ...config, maxUsdPerDeliberation: 0.001 } as Config;
  const { deps, rows } = panel(() => "good");
  const run = await deliberate(tight, "run", sheet, deps);
  assert.equal(run.status, "failed");
  assert.equal(run.failedAtWave, "advocates");
  assert.ok(!rows.some((r) => r.role === "judge"));
});

test("the spare waits before it is spent, so a rate limit has time to lift", async () => {
  assert.ok(RETRY_PAUSE_MS >= 1000, "a retry that does not wait meets the same limit");
  const { deps } = panel((model, attempt) => (model === "m/jon" && attempt === 1 ? "throw" : "good"));
  const started = Date.now();
  await deliberate(config, "run", sheet, { ...deps, retryPauseMs: 40 });
  assert.ok(Date.now() - started >= 40, "the pause was actually taken");
});
