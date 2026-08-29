// The panel, run behind a job.
//
// A background function answers 202 at once and may run for up to fifteen minutes,
// which is what a deliberation needs: seven calls across seven providers took
// twenty seconds when it was measured, and one judge alone took eleven. Nothing is
// returned from here. Every call writes its own row as it lands, and the browser
// reads those rows through `runs`.

import { readConfig, MissingConfig } from "../../src/config.ts";
import { findCase, findDeliberation, insertCall, updateDeliberation } from "../../src/store.ts";
import { callModel } from "../../src/openrouter.ts";
import { loadPrices } from "../../src/pricing.ts";
import { deliberate } from "../../src/deliberate.ts";
import type { ChargeSheet } from "../../src/charge-sheet.ts";

export default async (request: Request): Promise<Response> => {
  let config;
  try {
    config = readConfig();
  } catch (error) {
    if (error instanceof MissingConfig) console.error(error.message);
    return new Response(null, { status: 202 });
  }

  const body = (await request.json().catch(() => null)) as { runId?: string } | null;
  const runId = body?.runId;
  if (!runId) {
    console.error("a deliberation was asked for without a run");
    return new Response(null, { status: 202 });
  }

  try {
    const run = await findDeliberation(config, runId);
    if (!run) throw new Error(`no run ${runId}`);
    if (run["status"] !== "running") {
      console.error(`run ${runId} is already ${String(run["status"])}`);
      return new Response(null, { status: 202 });
    }

    const found = await findCase(config, String(run["case_id"]));
    if (!found) throw new Error("the case behind this run is gone");

    const sheet: ChargeSheet = {
      accused: found.accused,
      deceased: found.deceased,
      act_alleged: found.act_alleged,
      background: found.background,
      agreed_facts: found.agreed_facts,
      question: found.question,
    };

    const outcome = await deliberate(config, runId, sheet, {
      call: (options) => callModel(config, options),
      prices: () => loadPrices(),
      writeCall: (row) => insertCall(config, row),
    });

    await updateDeliberation(config, runId, {
      status: outcome.status,
      failed_at_wave: outcome.failedAtWave,
      retry_used: outcome.retryUsed,
      finished_at: new Date().toISOString(),
    });
  } catch (error) {
    // The run is marked failed rather than left running for ever. Which wave it
    // reached is already in the rows.
    console.error("the deliberation did not finish:", error);
    await updateDeliberation(config, runId, {
      status: "failed",
      failed_at_wave: "advocates",
      finished_at: new Date().toISOString(),
    }).catch((second) => console.error("and the run could not be marked failed:", second));
  }

  return new Response(null, { status: 202 });
};
