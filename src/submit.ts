// What happens when a charge sheet arrives, with the database held at arm's
// length so that the decision can be tested without one.

import { checkChargeSheet, type ChargeSheet, type Problem } from "./charge-sheet.ts";

export type Stored = { id: string; reference: string };
export type StoreCase = (sheet: ChargeSheet, reference: string) => Promise<Stored>;

export type Outcome =
  | { status: 201; body: Stored }
  | { status: 400; body: { error: string } }
  | { status: 422; body: { error: string; problems: Problem[] } };

const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9-]{0,31}$/;

/** A reference for a sheet that did not bring one. T-001 is the package's own
 *  case and is never generated. */
export function generateReference(random = Math.random): string {
  const suffix = Math.floor(random() * 0xffffff)
    .toString(16)
    .padStart(6, "0")
    .toUpperCase();
  return `C-${suffix}`;
}

export async function handleSubmission(body: unknown, store: StoreCase): Promise<Outcome> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { status: 400, body: { error: "the request body must be a charge sheet" } };
  }

  const problems = checkChargeSheet(body);
  if (problems.length > 0) {
    // Every failing field, never only the first. A user who fixes one fault per
    // attempt learns the rules one rejection at a time, and there is no reason to
    // make anyone pay that.
    return { status: 422, body: { error: "the charge sheet was refused", problems } };
  }

  const sheet = body as ChargeSheet;
  const asked = (body as { reference?: unknown }).reference;
  let reference: string;
  if (asked === undefined || asked === null || asked === "") {
    reference = generateReference();
  } else if (typeof asked === "string" && REFERENCE.test(asked)) {
    reference = asked;
  } else {
    return { status: 400, body: { error: "the case reference is not a usable reference" } };
  }

  const stored = await store(
    {
      accused: sheet.accused,
      deceased: sheet.deceased ?? null,
      act_alleged: sheet.act_alleged,
      background: sheet.background,
      agreed_facts: sheet.agreed_facts,
      question: sheet.question,
    },
    reference,
  );

  return { status: 201, body: stored };
}
