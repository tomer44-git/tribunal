import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRunView } from "../src/view.ts";
import type { StoredCase } from "../src/store.ts";

const chargeSheet = { id: "c", reference: "T-001" } as StoredCase;

const row = (over: Record<string, unknown>) => ({
  agent: "jon",
  role: "advocate",
  seat: "defence",
  status: "complete",
  is_retry: false,
  position: "justified",
  verdict: null,
  reasons: ["a", "b"],
  controlling_ground: null,
  error: null,
  model_requested: "m/x",
  model_answered: "m/x",
  tokens_in: 100,
  tokens_out: 10,
  price_in_per_m: 1,
  price_out_per_m: 10,
  cost_usd: 0.001,
  latency_ms: 5,
  seq: 1,
  ...over,
});

const judge = (agent: string, seq: number, over: Record<string, unknown> = {}) =>
  row({
    agent,
    role: "judge",
    seat: null,
    seq,
    position: null,
    verdict: "not justified",
    controlling_ground: "the ground",
    ...over,
  });

const run = (over: Record<string, unknown> = {}) => ({
  id: "r",
  status: "complete",
  failed_at_wave: null,
  retry_used: false,
  started_at: "2026-08-30T10:00:00.000Z",
  finished_at: "2026-08-30T10:00:20.000Z",
  ...over,
});

const fourAdvocates = [
  row({ agent: "jon", seq: 1 }),
  row({ agent: "tyrion", seq: 2 }),
  row({ agent: "daenerys", seat: "prosecution", seq: 3 }),
  row({ agent: "grey_worm", seat: "prosecution", seq: 4 }),
];

test("three opinions come back as three, in seat order, with nothing merged", () => {
  const view = buildRunView(
    run() as never,
    chargeSheet,
    [...fourAdvocates, judge("barak", 5), judge("elon", 6, { verdict: "justified" }), judge("shamgar", 7)] as never,
  );
  assert.equal(view.judges.length, 3);
  assert.deepEqual(view.judges.map((j) => j.agent), ["barak", "elon", "shamgar"]);
  assert.deepEqual(view.judges.map((j) => j.verdict), ["not justified", "justified", "not justified"]);
  assert.ok(!("majority" in view) && !("summary" in view));
});

test("the screen carries full attribution, which a judge's prompt never does", () => {
  const view = buildRunView(run() as never, chargeSheet, fourAdvocates as never);
  assert.deepEqual(view.advocates.map((a) => a.name), [
    "Jon Snow",
    "Tyrion Lannister",
    "Daenerys Targaryen",
    "Grey Worm",
  ]);
  assert.deepEqual(view.advocates.map((a) => a.seat), [
    "defence",
    "defence",
    "prosecution",
    "prosecution",
  ]);
});

test("two opinions are shown but the run is not a finished result", () => {
  const view = buildRunView(
    run({ status: "failed", failed_at_wave: "judges" }) as never,
    chargeSheet,
    [
      ...fourAdvocates,
      judge("barak", 5),
      judge("elon", 6),
      judge("shamgar", 7, { status: "failed", verdict: null, controlling_ground: null, reasons: null, error: "503" }),
    ] as never,
  );
  assert.equal(view.judges.length, 3, "the failed seat is still shown");
  assert.equal(view.judges.find((j) => j.agent === "shamgar")!.verdict, null);
  assert.equal(view.finished, true);
  assert.equal(view.isFinishedResult, false);
});

test("a run still going is neither finished nor a result", () => {
  const view = buildRunView(
    run({ status: "running", finished_at: null }) as never,
    chargeSheet,
    fourAdvocates as never,
  );
  assert.equal(view.finished, false);
  assert.equal(view.isFinishedResult, false);
  assert.equal(view.judges.length, 0);
  assert.equal(view.economics.wallMs, null);
});

test("a retry replaces its seat on the screen and both calls stay in the bill", () => {
  const rows = [
    ...fourAdvocates,
    row({ agent: "tyrion", seq: 2, status: "malformed", position: null, reasons: null, cost_usd: 0.002 }),
    row({ agent: "tyrion", seq: 8, is_retry: true, cost_usd: 0.003 }),
  ];
  const view = buildRunView(run() as never, chargeSheet, rows as never);
  const tyrion = view.advocates.find((a) => a.agent === "tyrion")!;
  assert.equal(tyrion.status, "complete");
  assert.equal(tyrion.isRetry, true);
  assert.equal(view.economics.calls, 6, "every call counts, including the one that failed");
});

test("a call served by another model says so", () => {
  const view = buildRunView(
    run() as never,
    chargeSheet,
    [row({ model_requested: "asked/for", model_answered: "served/by" })] as never,
  );
  assert.equal(view.advocates[0]!.routedElsewhere, true);
  assert.equal(view.advocates[0]!.model, "served/by");
});

test("the economics add up the rows and nothing else", () => {
  const view = buildRunView(
    run() as never,
    chargeSheet,
    [...fourAdvocates, judge("barak", 5, { tokens_in: 2000, tokens_out: 500, cost_usd: 0.01 })] as never,
  );
  assert.equal(view.economics.tokensIn, 100 * 4 + 2000);
  assert.equal(view.economics.tokensOut, 10 * 4 + 500);
  assert.ok(Math.abs(view.economics.costUsd - (0.001 * 4 + 0.01)) < 1e-12);
  assert.equal(view.economics.wallMs, 20000);
});
