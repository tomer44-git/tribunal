// One deliberation through the orchestrator, the way the background function runs
// it: the spare, the wave rules, and the closing status all included.
//
// This spends about three and a half cents. Never run automatically:
//
//   node --env-file=.env scripts/run.ts

import { readFileSync } from "node:fs";
import { readConfig } from "../src/config.ts";
import { insertCase, insertDeliberation, insertCall, updateDeliberation } from "../src/store.ts";
import { callModel } from "../src/openrouter.ts";
import { loadPrices } from "../src/pricing.ts";
import { deliberate } from "../src/deliberate.ts";
import type { ChargeSheet } from "../src/charge-sheet.ts";

const config = readConfig();
const sheet = JSON.parse(
  readFileSync(new URL("../test/fixtures/t001.json", import.meta.url), "utf8"),
) as ChargeSheet;

const reference = `TUNE-${Date.now().toString(36).toUpperCase()}`;
const storedCase = await insertCase(config, sheet, reference);
const run = await insertDeliberation(config, storedCase.id);
console.log(`run ${reference}\n`);

const started = Date.now();
const outcome = await deliberate(config, run.id, sheet, {
  call: (options) => callModel(config, options),
  prices: () => loadPrices(),
  writeCall: (row) => insertCall(config, row),
});
const wall = Date.now() - started;

await updateDeliberation(config, run.id, {
  status: outcome.status,
  failed_at_wave: outcome.failedAtWave,
  retry_used: outcome.retryUsed,
  finished_at: new Date().toISOString(),
});

const CROSSES = { defence: "not justified", prosecution: "justified" } as const;

console.log("REPRESENTATIVES");
for (const a of outcome.advocates) {
  const crossed = a.submission && CROSSES[a.seat] === a.submission.position ? "  ← crossed" : "";
  console.log(`  ${a.agent.padEnd(10)} ${a.seat.padEnd(11)} ${(a.submission?.position ?? a.row.error ?? a.status)}${crossed}`);
}

console.log("\nJUDGES");
for (const j of outcome.judges) {
  console.log(`  ${j.agent.padEnd(8)} ${j.opinion?.verdict ?? j.row.error ?? j.status}`);
  if (j.opinion) console.log(`           ${j.opinion.controlling_ground}`);
}

console.log(`\nstatus    ${outcome.status}${outcome.failedAtWave ? ` at the ${outcome.failedAtWave}` : ""}`);
console.log(`retry     ${outcome.retryUsed ? "spent" : "unspent"}`);
console.log(`cost      $${outcome.costUsd.toFixed(6)}`);
console.log(`time      ${wall} ms`);
console.log(`verdicts  ${outcome.judges.map((j) => j.opinion?.verdict ?? "—").join(" | ")}`);
