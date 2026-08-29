// What the screen is given.
//
// Three opinions go out as three. Nothing here counts verdicts, orders them by
// popularity, or reduces them to a majority — an advocate's position is not a
// verdict and is never added to them either. The only arithmetic in this file is
// addition of tokens and money, which is what Mikael asked to see.

import { ADVOCATES, JUDGES, NAME_OF, SEAT_OF, type Agent } from "./config.ts";
import type { StoredCase } from "./store.ts";

export type CallView = {
  agent: Agent;
  name: string;
  role: "advocate" | "judge";
  seat: "defence" | "prosecution" | null;
  status: "complete" | "malformed" | "failed";
  isRetry: boolean;
  position: string | null;
  verdict: string | null;
  reasons: string[] | null;
  controllingGround: string | null;
  error: string | null;
  model: string;
  modelRequested: string;
  routedElsewhere: boolean;
  tokensIn: number;
  tokensOut: number;
  priceInPerM: number | null;
  priceOutPerM: number | null;
  costUsd: number | null;
  latencyMs: number | null;
};

export type RunView = {
  id: string;
  status: "running" | "complete" | "failed";
  failedAtWave: "advocates" | "judges" | null;
  retryUsed: boolean;
  finished: boolean;
  /** A run is only a finished result with three opinions. Two opinions are still
   *  shown; they are simply not presented as the panel's answer. */
  isFinishedResult: boolean;
  chargeSheet: StoredCase;
  advocates: CallView[];
  judges: CallView[];
  economics: {
    calls: number;
    tokensIn: number;
    tokensOut: number;
    costUsd: number;
    wallMs: number | null;
  };
};

type Row = {
  agent: string;
  role: "advocate" | "judge";
  seat: "defence" | "prosecution" | null;
  status: "complete" | "malformed" | "failed";
  is_retry: boolean;
  position: string | null;
  verdict: string | null;
  reasons: string[] | null;
  controlling_ground: string | null;
  error: string | null;
  model_requested: string;
  model_answered: string | null;
  tokens_in: number;
  tokens_out: number;
  price_in_per_m: number | null;
  price_out_per_m: number | null;
  cost_usd: number | null;
  latency_ms: number | null;
  seq: number;
};

type RunRow = {
  id: string;
  status: "running" | "complete" | "failed";
  failed_at_wave: "advocates" | "judges" | null;
  retry_used: boolean;
  started_at: string;
  finished_at: string | null;
};

const toView = (row: Row): CallView => ({
  agent: row.agent as Agent,
  name: NAME_OF[row.agent as Agent] ?? row.agent,
  role: row.role,
  seat: row.seat,
  status: row.status,
  isRetry: row.is_retry,
  position: row.position,
  verdict: row.verdict,
  reasons: row.reasons,
  controllingGround: row.controlling_ground,
  error: row.error,
  model: row.model_answered ?? row.model_requested,
  modelRequested: row.model_requested,
  routedElsewhere: row.model_answered !== null && row.model_answered !== row.model_requested,
  tokensIn: row.tokens_in,
  tokensOut: row.tokens_out,
  priceInPerM: row.price_in_per_m,
  priceOutPerM: row.price_out_per_m,
  costUsd: row.cost_usd,
  latencyMs: row.latency_ms,
});

/** The latest attempt for each agent. A retry replaces the row it retried on the
 *  screen; both remain in the log, which is where the record lives. */
function latestPerAgent(rows: Row[], order: readonly string[]): CallView[] {
  const byAgent = new Map<string, Row>();
  for (const row of rows) {
    const held = byAgent.get(row.agent);
    if (!held || row.seq > held.seq) byAgent.set(row.agent, row);
  }
  return order.flatMap((agent) => {
    const row = byAgent.get(agent);
    return row ? [toView(row)] : [];
  });
}

export function buildRunView(run: RunRow, chargeSheet: StoredCase, rows: Row[]): RunView {
  const advocates = latestPerAgent(
    rows.filter((r) => r.role === "advocate"),
    ADVOCATES,
  );
  const judges = latestPerAgent(
    rows.filter((r) => r.role === "judge"),
    JUDGES,
  );

  const opinions = judges.filter((j) => j.status === "complete").length;
  const finished = run.status !== "running";

  return {
    id: run.id,
    status: run.status,
    failedAtWave: run.failed_at_wave,
    retryUsed: run.retry_used,
    finished,
    isFinishedResult: finished && opinions === JUDGES.length,
    chargeSheet,
    advocates,
    judges,
    economics: {
      // Every call counts, including the ones that failed and the retries. This is
      // what was spent, not what succeeded.
      calls: rows.length,
      tokensIn: rows.reduce((sum, r) => sum + r.tokens_in, 0),
      tokensOut: rows.reduce((sum, r) => sum + r.tokens_out, 0),
      costUsd: rows.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0),
      wallMs: run.finished_at
        ? new Date(run.finished_at).getTime() - new Date(run.started_at).getTime()
        : null,
    },
  };
}

export { SEAT_OF };
