// Submitting a charge sheet, and reading one back.
//
// The browser runs the same rules before it posts, as a courtesy. This runs them
// again on every submission with no exception for a request that says it was
// checked already, because the browser's copy runs on the user's machine.

import { readConfig, MissingConfig } from "../../src/config.ts";
import { handleSubmission } from "../../src/submit.ts";
import { insertCase, findCase, StoreError } from "../../src/store.ts";

const json = (status: number, body: unknown): Response =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export default async (request: Request): Promise<Response> => {
  let config;
  try {
    config = readConfig();
  } catch (error) {
    // The names of what is missing go to the function log, never to the caller.
    if (error instanceof MissingConfig) console.error(error.message);
    return json(500, { error: "the server is not configured" });
  }

  const url = new URL(request.url);

  if (request.method === "GET") {
    const id = url.searchParams.get("id");
    if (!id) return json(400, { error: "ask for a case by id" });
    try {
      const found = await findCase(config, id);
      return found ? json(200, found) : json(404, { error: "no such case" });
    } catch (error) {
      console.error("reading a case failed:", error);
      return json(502, { error: "the case could not be read" });
    }
  }

  if (request.method !== "POST") {
    return json(405, { error: "post a charge sheet, or get one by id" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "the request body must be JSON" });
  }

  try {
    const outcome = await handleSubmission(body, async (sheet, reference) => {
      const row = await insertCase(config, sheet, reference);
      return { id: row.id, reference: row.reference };
    });
    return json(outcome.status, outcome.body);
  } catch (error) {
    if (error instanceof StoreError) {
      // The detail can quote the row that failed, and the row is whatever a user
      // typed. It goes to the log and not into a response.
      console.error("storing a case failed:", error.status, error.detail);
      const duplicate = error.detail.includes("cases_reference_key");
      return duplicate
        ? json(409, { error: "a case with that reference already exists" })
        : json(502, { error: "the case could not be stored" });
    }
    console.error("storing a case failed:", error);
    return json(500, { error: "the case could not be stored" });
  }
};
