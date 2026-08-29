// The database, reached over its REST interface with fetch and nothing else.
//
// The key used here bypasses row-level security, so this module never runs
// anywhere but inside a function. It holds no rules of its own: what may be
// written is decided before anything gets here, and what may not be written is
// refused by the database.

import type { ChargeSheet } from "./charge-sheet.ts";
import type { Config } from "./config.ts";

export type StoredCase = ChargeSheet & { id: string; reference: string; created_at: string };

export class StoreError extends Error {
  readonly status: number;
  readonly detail: string;
  constructor(message: string, status: number, detail: string) {
    super(message);
    this.name = "StoreError";
    this.status = status;
    this.detail = detail;
  }
}

async function request(
  config: Config,
  path: string,
  init: RequestInit & { prefer?: string } = {},
): Promise<unknown> {
  const headers: Record<string, string> = {
    apikey: config.supabaseSecretKey,
    authorization: `Bearer ${config.supabaseSecretKey}`,
    "content-type": "application/json",
  };
  if (init.prefer) headers["prefer"] = init.prefer;

  const response = await fetch(`${config.supabaseUrl}/rest/v1${path}`, { ...init, headers });
  const text = await response.text();
  if (!response.ok) {
    // The detail is kept for the log and never returned to a browser: it can
    // quote the row that failed, and a row can hold anything a user typed.
    throw new StoreError("the database refused the write", response.status, text);
  }
  return text.length > 0 ? JSON.parse(text) : null;
}

export async function insertCase(
  config: Config,
  sheet: ChargeSheet,
  reference: string,
): Promise<StoredCase> {
  const rows = (await request(config, "/cases", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify([{ ...sheet, reference }]),
  })) as StoredCase[];

  const row = rows?.[0];
  if (!row) throw new StoreError("the database accepted the case and returned nothing", 500, "");
  return row;
}

export type CallRow = {
  deliberation_id: string;
  seq: number;
  role: "advocate" | "judge";
  agent: string;
  seat: "defence" | "prosecution" | null;
  is_retry: boolean;
  status: "complete" | "malformed" | "failed";
  model_requested: string;
  model_answered: string | null;
  position: string | null;
  verdict: string | null;
  reasons: string[] | null;
  controlling_ground: string | null;
  tokens_in: number;
  tokens_out: number;
  price_in_per_m: number | null;
  price_out_per_m: number | null;
  cost_usd: number | null;
  latency_ms: number | null;
  raw_response: string | null;
  error: string | null;
};

export async function insertDeliberation(config: Config, caseId: string): Promise<{ id: string }> {
  const rows = (await request(config, "/deliberations", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify([{ case_id: caseId, status: "running" }]),
  })) as { id: string }[];
  const row = rows?.[0];
  if (!row) throw new StoreError("the database accepted the run and returned nothing", 500, "");
  return row;
}

export async function updateDeliberation(
  config: Config,
  id: string,
  fields: {
    status: "running" | "complete" | "failed";
    failed_at_wave?: "advocates" | "judges" | null;
    retry_used?: boolean;
    finished_at?: string;
  },
): Promise<void> {
  await request(config, `/deliberations?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
}

/** Every model call gets its own row, including the ones that failed. A call that
 *  ran and was not written down did not happen. */
export async function insertCall(config: Config, row: CallRow): Promise<{ id: string }> {
  const rows = (await request(config, "/calls", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify([row]),
  })) as { id: string }[];
  const written = rows?.[0];
  if (!written) throw new StoreError("the database accepted the call and returned nothing", 500, "");
  return written;
}

export async function findCase(config: Config, id: string): Promise<StoredCase | null> {
  const rows = (await request(config, `/cases?id=eq.${encodeURIComponent(id)}&select=*`)) as
    | StoredCase[]
    | null;
  return rows?.[0] ?? null;
}
