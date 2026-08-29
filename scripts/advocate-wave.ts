// The four advocates, for real, on four different models.
//
// This spends money — about a tenth of a cent. Never run automatically:
//
//   node --env-file=.env scripts/advocate-wave.ts

import { readFileSync } from "node:fs";
import { readConfig } from "../src/config.ts";
import { insertCase, insertDeliberation, insertCall } from "../src/store.ts";
import { callModel } from "../src/openrouter.ts";
import { loadPrices } from "../src/pricing.ts";
import { runAdvocateWave } from "../src/wave.ts";
import type { ChargeSheet } from "../src/charge-sheet.ts";

const config = readConfig();
const sheet = JSON.parse(
  readFileSync(new URL("../test/fixtures/t001.json", import.meta.url), "utf8"),
) as ChargeSheet;

const reference = `SMOKE-${Date.now().toString(36).toUpperCase()}`;
const storedCase = await insertCase(config, sheet, reference);
const run = await insertDeliberation(config, storedCase.id);
console.log(`case ${reference}\n`);

const started = Date.now();
const results = await runAdvocateWave(config, run.id, sheet, {
  call: (options) => callModel(config, options),
  prices: () => loadPrices(),
  writeCall: (row) => insertCall(config, row),
});
const wall = Date.now() - started;

let cost = 0;
for (const r of results) {
  const row = r.row;
  cost += row.cost_usd ?? 0;
  console.log(`${r.agent.padEnd(10)} ${r.seat.padEnd(11)} ${row.status.padEnd(9)} ${row.model_answered ?? row.model_requested}`);
  console.log(`  tokens ${row.tokens_in} in, ${row.tokens_out} out · $${(row.cost_usd ?? 0).toFixed(6)} · ${row.latency_ms} ms`);
  if (r.submission) {
    console.log(`  position: ${r.submission.position}`);
    r.submission.reasons.forEach((reason, i) => console.log(`    ${i + 1}. ${reason}`));
  } else {
    console.log(`  ${row.error}`);
  }
  console.log();
}

const crossed = results.filter(
  (r) =>
    r.submission &&
    ((r.seat === "defence" && r.submission.position === "not justified") ||
      (r.seat === "prosecution" && r.submission.position === "justified")),
);

console.log(`wave      ${wall} ms wall clock`);
console.log(`cost      $${cost.toFixed(6)}`);
console.log(`complete  ${results.filter((r) => r.status === "complete").length} of 4`);
console.log(`crossed   ${crossed.length} advocate(s) reached the position their seat argues against`);
console.log(`\ncleanup   reference '${reference}'`);
