// A whole deliberation, for real: four advocates, then three judges.
//
// This spends about three cents, most of it on the judges. Never run
// automatically:
//
//   node --env-file=.env scripts/deliberate.ts

import { readFileSync } from "node:fs";
import { readConfig } from "../src/config.ts";
import { insertCase, insertDeliberation, insertCall } from "../src/store.ts";
import { callModel } from "../src/openrouter.ts";
import { loadPrices } from "../src/pricing.ts";
import { runAdvocateWave, runJudgeWave } from "../src/wave.ts";
import type { ChargeSheet } from "../src/charge-sheet.ts";

const config = readConfig();
const sheet = JSON.parse(
  readFileSync(new URL("../test/fixtures/t001.json", import.meta.url), "utf8"),
) as ChargeSheet;

const deps = {
  call: (options: Parameters<typeof callModel>[1]) => callModel(config, options),
  prices: () => loadPrices(),
  writeCall: (row: Parameters<typeof insertCall>[1]) => insertCall(config, row),
};

const reference = `SMOKE-${Date.now().toString(36).toUpperCase()}`;
const storedCase = await insertCase(config, sheet, reference);
const run = await insertDeliberation(config, storedCase.id);
console.log(`case ${reference}\n`);

const started = Date.now();
const advocates = await runAdvocateWave(config, run.id, sheet, deps);
const afterAdvocates = Date.now() - started;

for (const a of advocates) {
  console.log(
    `${a.agent.padEnd(10)} ${a.seat.padEnd(11)} ${a.status.padEnd(9)} ${a.submission?.position ?? a.row.error}`,
  );
}

const submissions = advocates.flatMap((a) => (a.submission ? [a.submission] : []));
console.log(`\nadvocates ${afterAdvocates} ms, ${submissions.length} of 4 submissions\n`);

const judgesStarted = Date.now();
const judges = await runJudgeWave(config, run.id, sheet, submissions, deps);
const judgeMs = Date.now() - judgesStarted;

for (const j of judges) {
  console.log(`── ${j.agent} ── ${j.status} ── ${j.row.model_answered ?? j.row.model_requested}`);
  if (j.opinion) {
    console.log(`   verdict: ${j.opinion.verdict}`);
    console.log(`   ground:  ${j.opinion.controlling_ground}`);
    j.opinion.reasons.forEach((r, i) => console.log(`   ${i + 1}. ${r}`));
  } else {
    console.log(`   ${j.row.error}`);
  }
  console.log();
}

const rows = [...advocates, ...judges].map((r) => r.row);
const cost = rows.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0);
const tokensIn = rows.reduce((sum, r) => sum + r.tokens_in, 0);
const tokensOut = rows.reduce((sum, r) => sum + r.tokens_out, 0);

console.log(`calls     ${rows.length}`);
console.log(`tokens    ${tokensIn} in, ${tokensOut} out, ${tokensIn + tokensOut} together`);
console.log(`cost      $${cost.toFixed(6)}  (cap $${config.maxUsdPerDeliberation})`);
console.log(`time      ${afterAdvocates} ms advocates, ${judgeMs} ms judges, ${Date.now() - started} ms in all`);
console.log(`verdicts  ${judges.map((j) => j.opinion?.verdict ?? "—").join(" | ")}`);
console.log(`\ncleanup   reference '${reference}'`);
