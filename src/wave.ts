// The four advocates, run together.
//
// They do not depend on one another and never see one another, so they go out at
// once. Each returns its own row whatever happens to it: a call that ran and was
// not written down did not happen, and a call that failed is a row with a status
// rather than an absence.
//
// The sequence number says what a call was. One to four are the advocates in a
// fixed order, five to seven are the judges, and eight is the one spare. Seven
// panel calls and one retry is the whole cap, and it is legible in the log.

import { ADVOCATES, JUDGES, SEAT_OF, type Config } from "./config.ts";
import type { ChargeSheet } from "./charge-sheet.ts";
import { advocatePrompt, judgePrompt, type Submission } from "./prompt.ts";
import { parseAdvocate, parseJudge, ADVOCATE_SCHEMA, JUDGE_SCHEMA } from "./opinion.ts";
import { CallFailed, type CallResult } from "./openrouter.ts";
import { costOf, type Price } from "./pricing.ts";
import type { CallRow } from "./store.ts";

export const SEQ_OF_ADVOCATE: Record<(typeof ADVOCATES)[number], number> = {
  jon: 1,
  tyrion: 2,
  daenerys: 3,
  grey_worm: 4,
};

export const SEQ_OF_JUDGE: Record<(typeof JUDGES)[number], number> = {
  barak: 5,
  elon: 6,
  shamgar: 7,
};

export type Deps = {
  call: (options: { model: string; prompt: string; schema: unknown; schemaName: string }) => Promise<CallResult>;
  prices: () => Promise<Map<string, Price>>;
  writeCall: (row: CallRow) => Promise<unknown>;
};

export type AdvocateResult = {
  agent: (typeof ADVOCATES)[number];
  seat: "defence" | "prosecution";
  status: "complete" | "malformed" | "failed";
  submission: Submission | null;
  row: CallRow;
};

/**
 * What the call cost, and at what rate.
 *
 * The published price of a model is not reliably what a call is charged. Two
 * things break it, and the first real advocate wave showed both. A gateway routes
 * to whichever provider is serving the model, and that provider has its own
 * prices: llama-3.3-70b is listed at $0.71 per million each way and was billed at
 * $0.25 in and $0.75 out. And a provider may discount input it has seen recently,
 * which took gpt-5-nano's effective input rate to a seventh of its list price.
 *
 * So the rates are worked out from what was actually billed, which always
 * reconciles: cost equals tokens times rate, by construction. The price list is
 * kept only for a provider that reports no cost at all.
 */
export function priced(
  prices: Map<string, Price>,
  result: Pick<CallResult, "modelAnswered" | "tokensIn" | "tokensOut" | "costUsd" | "costIn" | "costOut">,
): Pick<CallRow, "price_in_per_m" | "price_out_per_m" | "cost_usd"> {
  const { modelAnswered, tokensIn, tokensOut, costUsd, costIn, costOut } = result;

  if (costUsd !== null) {
    const rate = (cost: number | null, tokens: number): number | null =>
      cost === null || tokens <= 0 ? null : (cost / tokens) * 1_000_000;
    return {
      price_in_per_m: rate(costIn, tokensIn),
      price_out_per_m: rate(costOut, tokensOut),
      cost_usd: costUsd,
    };
  }

  const price = modelAnswered ? prices.get(modelAnswered) : undefined;
  return {
    price_in_per_m: price?.inPerMillion ?? null,
    price_out_per_m: price?.outPerMillion ?? null,
    cost_usd: costOf(price, tokensIn, tokensOut),
  };
}

export async function runOneAdvocate(
  config: Config,
  deliberationId: string,
  sheet: ChargeSheet,
  agent: (typeof ADVOCATES)[number],
  deps: Deps,
  prices: Map<string, Price>,
  isRetry = false,
  seq?: number,
): Promise<AdvocateResult> {
  const seat = SEAT_OF[agent];
  const model = config.models[agent];
  const base = {
    deliberation_id: deliberationId,
    seq: seq ?? SEQ_OF_ADVOCATE[agent],
    role: "advocate" as const,
    agent,
    seat,
    is_retry: isRetry,
    model_requested: model,
    verdict: null,
    controlling_ground: null,
  };

  let result: CallResult;
  try {
    result = await deps.call({
      model,
      prompt: advocatePrompt(agent, sheet),
      schema: ADVOCATE_SCHEMA,
      schemaName: "advocate_opinion",
    });
  } catch (error) {
    const failure = error instanceof CallFailed ? error : null;
    const row: CallRow = {
      ...base,
      status: "failed",
      model_answered: null,
      position: null,
      reasons: null,
      tokens_in: 0,
      tokens_out: 0,
      price_in_per_m: null,
      price_out_per_m: null,
      cost_usd: null,
      latency_ms: failure?.latencyMs ?? null,
      raw_response: failure?.raw || null,
      error: error instanceof Error ? error.message : "the call did not complete",
    };
    await deps.writeCall(row);
    return { agent, seat, status: "failed", submission: null, row };
  }

  const parsed = result.content
    ? parseAdvocate(result.content)
    : ({ ok: false, why: "the answer had no content" } as const);

  const row: CallRow = {
    ...base,
    status: parsed.ok ? "complete" : "malformed",
    model_answered: result.modelAnswered,
    // A malformed answer never leaves an outcome behind. The database refuses it
    // too, but nothing should be relying on that to catch it.
    position: parsed.ok ? parsed.value.position : null,
    reasons: parsed.ok ? parsed.value.reasons : null,
    tokens_in: result.tokensIn,
    tokens_out: result.tokensOut,
    ...priced(prices, result),
    latency_ms: result.latencyMs,
    raw_response: result.raw,
    error: parsed.ok ? null : parsed.why,
  };

  await deps.writeCall(row);

  return {
    agent,
    seat,
    status: parsed.ok ? "complete" : "malformed",
    submission: parsed.ok ? { seat, position: parsed.value.position, reasons: parsed.value.reasons } : null,
    row,
  };
}

export async function runAdvocateWave(
  config: Config,
  deliberationId: string,
  sheet: ChargeSheet,
  deps: Deps,
): Promise<AdvocateResult[]> {
  const prices = await deps.prices();
  return Promise.all(
    ADVOCATES.map((agent) => runOneAdvocate(config, deliberationId, sheet, agent, deps, prices)),
  );
}

export type JudgeResult = {
  agent: (typeof JUDGES)[number];
  status: "complete" | "malformed" | "failed";
  opinion: { verdict: string; reasons: string[]; controlling_ground: string } | null;
  row: CallRow;
};

export async function runOneJudge(
  config: Config,
  deliberationId: string,
  sheet: ChargeSheet,
  submissions: Submission[],
  agent: (typeof JUDGES)[number],
  deps: Deps,
  prices: Map<string, Price>,
  isRetry = false,
  seq?: number,
): Promise<JudgeResult> {
  const model = config.models[agent];
  const base = {
    deliberation_id: deliberationId,
    seq: seq ?? SEQ_OF_JUDGE[agent],
    role: "judge" as const,
    agent,
    // A judge has no seat. It is not seated on a side and the column says so.
    seat: null,
    is_retry: isRetry,
    model_requested: model,
    position: null,
  };

  let result: CallResult;
  try {
    result = await deps.call({
      model,
      prompt: judgePrompt(agent, sheet, submissions),
      schema: JUDGE_SCHEMA,
      schemaName: "judge_opinion",
    });
  } catch (error) {
    const failure = error instanceof CallFailed ? error : null;
    const row: CallRow = {
      ...base,
      status: "failed",
      model_answered: null,
      verdict: null,
      reasons: null,
      controlling_ground: null,
      tokens_in: 0,
      tokens_out: 0,
      price_in_per_m: null,
      price_out_per_m: null,
      cost_usd: null,
      latency_ms: failure?.latencyMs ?? null,
      raw_response: failure?.raw || null,
      error: error instanceof Error ? error.message : "the call did not complete",
    };
    await deps.writeCall(row);
    return { agent, status: "failed", opinion: null, row };
  }

  const parsed = result.content
    ? parseJudge(result.content)
    : ({ ok: false, why: "the answer had no content" } as const);

  const row: CallRow = {
    ...base,
    status: parsed.ok ? "complete" : "malformed",
    model_answered: result.modelAnswered,
    verdict: parsed.ok ? parsed.value.verdict : null,
    reasons: parsed.ok ? parsed.value.reasons : null,
    controlling_ground: parsed.ok ? parsed.value.controlling_ground : null,
    tokens_in: result.tokensIn,
    tokens_out: result.tokensOut,
    ...priced(prices, result),
    latency_ms: result.latencyMs,
    raw_response: result.raw,
    error: parsed.ok ? null : parsed.why,
  };

  await deps.writeCall(row);
  return {
    agent,
    status: parsed.ok ? "complete" : "malformed",
    opinion: parsed.ok ? parsed.value : null,
    row,
  };
}

/**
 * The three judges, run together.
 *
 * They wait for the advocates and not for each other, and they never see one
 * another's opinions. Three opinions go out as three: nothing here compares them,
 * ranks them or reconciles them, and a judge that fails leaves the other two
 * standing.
 */
export async function runJudgeWave(
  config: Config,
  deliberationId: string,
  sheet: ChargeSheet,
  submissions: Submission[],
  deps: Deps,
): Promise<JudgeResult[]> {
  const prices = await deps.prices();
  return Promise.all(
    JUDGES.map((agent) => runOneJudge(config, deliberationId, sheet, submissions, agent, deps, prices)),
  );
}
