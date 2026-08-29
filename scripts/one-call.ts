// One real call to one real model, written down the way every call will be.
//
// This spends money. It is never run automatically — not on a commit, not in a
// deployment, not on a file save. Run it by hand:
//
//   node --env-file=.env scripts/one-call.ts
//
// It writes a case, a deliberation and one call row, using a SMOKE- reference so
// that it never occupies T-001. The server has no delete privilege, so the rows it
// leaves are removed by hand in the SQL editor.

import { readFileSync } from "node:fs";
import { readConfig, SEAT_OF } from "../src/config.ts";
import { insertCase, insertDeliberation, insertCall } from "../src/store.ts";
import { advocatePrompt } from "../src/prompt.ts";
import { parseAdvocate, ADVOCATE_SCHEMA } from "../src/opinion.ts";
import { callModel, CallFailed } from "../src/openrouter.ts";
import { loadPrices, costOf } from "../src/pricing.ts";
import type { ChargeSheet } from "../src/charge-sheet.ts";

const config = readConfig();
const sheet = JSON.parse(
  readFileSync(new URL("../test/fixtures/t001.json", import.meta.url), "utf8"),
) as ChargeSheet;

const reference = `SMOKE-${Date.now().toString(36).toUpperCase()}`;
const agent = "jon" as const;
const model = config.models[agent];

console.log(`case      ${reference}`);
console.log(`agent     ${agent} (${SEAT_OF[agent]} seat)`);
console.log(`asked     ${model}\n`);

const storedCase = await insertCase(config, sheet, reference);
const run = await insertDeliberation(config, storedCase.id);

const prompt = advocatePrompt(agent, sheet);
console.log(`prompt    ${prompt.length} characters\n`);

let result;
let failure: CallFailed | null = null;
try {
  result = await callModel(config, {
    model,
    prompt,
    schema: ADVOCATE_SCHEMA,
    schemaName: "advocate_opinion",
  });
} catch (error) {
  if (!(error instanceof CallFailed)) throw error;
  failure = error;
}

const prices = await loadPrices();

if (failure) {
  await insertCall(config, {
    deliberation_id: run.id,
    seq: 1,
    role: "advocate",
    agent,
    seat: SEAT_OF[agent],
    is_retry: false,
    status: "failed",
    model_requested: model,
    model_answered: null,
    position: null,
    verdict: null,
    reasons: null,
    controlling_ground: null,
    tokens_in: 0,
    tokens_out: 0,
    price_in_per_m: null,
    price_out_per_m: null,
    cost_usd: null,
    latency_ms: failure.latencyMs,
    raw_response: failure.raw || null,
    error: failure.message,
  });
  console.log(`FAILED    ${failure.message}`);
  console.log(`row       written with status failed and no outcome`);
  process.exit(1);
}

const answered = result!.modelAnswered;
const price = answered ? prices.get(answered) : undefined;
const cost = costOf(price, result!.tokensIn, result!.tokensOut);
const parsed = result!.content ? parseAdvocate(result!.content) : ({ ok: false, why: "no content" } as const);

await insertCall(config, {
  deliberation_id: run.id,
  seq: 1,
  role: "advocate",
  agent,
  seat: SEAT_OF[agent],
  is_retry: false,
  status: parsed.ok ? "complete" : "malformed",
  model_requested: model,
  model_answered: answered,
  position: parsed.ok ? parsed.value.position : null,
  verdict: null,
  reasons: parsed.ok ? parsed.value.reasons : null,
  controlling_ground: null,
  tokens_in: result!.tokensIn,
  tokens_out: result!.tokensOut,
  price_in_per_m: price?.inPerMillion ?? null,
  price_out_per_m: price?.outPerMillion ?? null,
  cost_usd: cost,
  latency_ms: result!.latencyMs,
  raw_response: result!.raw,
  error: parsed.ok ? null : parsed.why,
});

console.log(`answered  ${answered}`);
console.log(`routed    ${answered === model ? "no — same model" : "YES — a different model answered"}`);
console.log(`tokens    ${result!.tokensIn} in, ${result!.tokensOut} out`);
console.log(`price     $${price?.inPerMillion ?? "?"} / $${price?.outPerMillion ?? "?"} per million`);
console.log(`cost      $${cost?.toFixed(6) ?? "?"}`);
console.log(`time      ${result!.latencyMs} ms`);
console.log(`status    ${parsed.ok ? "complete" : `malformed — ${parsed.why}`}\n`);

if (parsed.ok) {
  console.log(`position  ${parsed.value.position}`);
  parsed.value.reasons.forEach((reason, i) => console.log(`reason ${i + 1}  ${reason}`));
}
console.log(`\ncleanup   delete from public.cases where reference = '${reference}' -- after its calls and deliberation`);
