// A whole deliberation, and what happens when part of it does not arrive.
//
// The rules this file exists to keep:
//
//   Eight model calls at most. Seven for the panel and one spare.
//   One retry for the whole deliberation, not one per agent. The first failure of
//     any kind claims it and the next failure in that run has none.
//   A judge that fails shows as a failure in its own seat. The other opinions
//     stand and are displayed.
//   An advocate that fails stops the run before the judge wave, and is named.
//   A run with fewer than three opinions is an incomplete run and is never shown
//     as a finished result — even though the opinions that did arrive are shown.
//   Nothing is ever recovered from prose, and no default verdict is written.

import { ADVOCATES, JUDGES, type Config } from "./config.ts";
import type { ChargeSheet } from "./charge-sheet.ts";
import type { Submission } from "./prompt.ts";
import {
  runOneAdvocate,
  runOneJudge,
  type AdvocateResult,
  type JudgeResult,
  type Deps,
} from "./wave.ts";
import type { Price } from "./pricing.ts";

export const RETRY_SEQ = 8;

export type Deliberation = {
  status: "complete" | "failed";
  failedAtWave: "advocates" | "judges" | null;
  /** Named when the run stopped in the advocate wave. */
  failedAdvocates: string[];
  advocates: AdvocateResult[];
  judges: JudgeResult[];
  retryUsed: boolean;
  costUsd: number;
};

const costOfRows = (results: { row: { cost_usd: number | null } }[]): number =>
  results.reduce((sum, r) => sum + (r.row.cost_usd ?? 0), 0);

export async function deliberate(
  config: Config,
  deliberationId: string,
  sheet: ChargeSheet,
  deps: Deps,
): Promise<Deliberation> {
  const prices: Map<string, Price> = await deps.prices();
  let retryUsed = false;

  // --- the advocates, together --------------------------------------------
  let advocates = await Promise.all(
    ADVOCATES.map((agent) =>
      runOneAdvocate(config, deliberationId, sheet, agent, deps, prices, false, undefined),
    ),
  );

  // The spare goes to the first failure in a fixed order, so that which agent
  // claimed it is never a matter of which one happened to answer first.
  const firstBadAdvocate = ADVOCATES.find(
    (agent) => advocates.find((a) => a.agent === agent)?.status !== "complete",
  );

  if (firstBadAdvocate) {
    retryUsed = true;
    const retried = await runOneAdvocate(
      config,
      deliberationId,
      sheet,
      firstBadAdvocate,
      deps,
      prices,
      true,
      RETRY_SEQ,
    );
    advocates = [...advocates.filter((a) => a.agent !== firstBadAdvocate), retried];
  }

  const failedAdvocates = ADVOCATES.filter(
    (agent) => advocates.find((a) => a.agent === agent)?.status !== "complete",
  );

  if (failedAdvocates.length > 0) {
    // The judges are the expensive half of the run, and with fewer than four
    // submissions they would be weighing a case that no other run can be compared
    // against. The run stops here and says which advocate stopped it.
    return {
      status: "failed",
      failedAtWave: "advocates",
      failedAdvocates: [...failedAdvocates],
      advocates,
      judges: [],
      retryUsed,
      costUsd: costOfRows(advocates),
    };
  }

  const spentSoFar = costOfRows(advocates);
  if (spentSoFar >= config.maxUsdPerDeliberation) {
    return {
      status: "failed",
      failedAtWave: "advocates",
      failedAdvocates: [],
      advocates,
      judges: [],
      retryUsed,
      costUsd: spentSoFar,
    };
  }

  const submissions: Submission[] = advocates
    .slice()
    .sort((a, b) => ADVOCATES.indexOf(a.agent) - ADVOCATES.indexOf(b.agent))
    .flatMap((a) => (a.submission ? [a.submission] : []));

  // --- the judges, together ------------------------------------------------
  let judges = await Promise.all(
    JUDGES.map((agent) =>
      runOneJudge(config, deliberationId, sheet, submissions, agent, deps, prices, false, undefined),
    ),
  );

  if (!retryUsed) {
    const firstBadJudge = JUDGES.find(
      (agent) => judges.find((j) => j.agent === agent)?.status !== "complete",
    );
    if (firstBadJudge) {
      retryUsed = true;
      const retried = await runOneJudge(
        config,
        deliberationId,
        sheet,
        submissions,
        firstBadJudge,
        deps,
        prices,
        true,
        RETRY_SEQ,
      );
      judges = [...judges.filter((j) => j.agent !== firstBadJudge), retried];
    }
  }

  const opinions = judges.filter((j) => j.status === "complete").length;

  return {
    // Three opinions or it is not a finished result. The ones that arrived are
    // still returned, and still shown: a failure is displayed in its own seat.
    status: opinions === JUDGES.length ? "complete" : "failed",
    failedAtWave: opinions === JUDGES.length ? null : "judges",
    failedAdvocates: [],
    advocates,
    judges,
    retryUsed,
    costUsd: costOfRows(advocates) + costOfRows(judges),
  };
}
