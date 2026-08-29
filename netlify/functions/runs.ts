// Starting a run, and reading how it is going.
//
// POST creates the deliberation and hands back its id. The panel itself is not run
// here: seven calls take about twenty seconds and a synchronous function does not
// have twenty seconds. `docs/01-architecture.md` said to move it behind a job if it
// stopped fitting, and it has, so the browser posts to the background function next
// and then asks this one for the state.
//
// The browser decides nothing. It asks what happened; the answer is read from the
// rows the server wrote.

import { readConfig, MissingConfig } from "../../src/config.ts";
import {
  findCase,
  findCalls,
  findDeliberation,
  insertDeliberation,
  StoreError,
} from "../../src/store.ts";
import { buildRunView } from "../../src/view.ts";

const json = (status: number, body: unknown): Response =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export default async (request: Request): Promise<Response> => {
  let config;
  try {
    config = readConfig();
  } catch (error) {
    if (error instanceof MissingConfig) console.error(error.message);
    return json(500, { error: "the server is not configured" });
  }

  const url = new URL(request.url);

  try {
    if (request.method === "POST") {
      const body = (await request.json().catch(() => null)) as { caseId?: string } | null;
      const caseId = body?.caseId;
      if (!caseId) return json(400, { error: "a run needs a case" });

      const found = await findCase(config, caseId);
      if (!found) return json(404, { error: "no such case" });

      const run = await insertDeliberation(config, found.id);
      return json(201, { id: run.id, caseId: found.id });
    }

    if (request.method === "GET") {
      const id = url.searchParams.get("id");
      if (!id) return json(400, { error: "ask for a run by id" });

      const run = await findDeliberation(config, id);
      if (!run) return json(404, { error: "no such run" });

      const chargeSheet = await findCase(config, String(run["case_id"]));
      if (!chargeSheet) return json(404, { error: "the case behind this run is gone" });

      const calls = await findCalls(config, id);
      return json(200, buildRunView(run as never, chargeSheet, calls as never));
    }

    return json(405, { error: "post a case to start a run, or get a run by id" });
  } catch (error) {
    if (error instanceof StoreError) console.error("a run query failed:", error.status, error.detail);
    else console.error("a run query failed:", error);
    return json(502, { error: "the run could not be read" });
  }
};
