// Checking the shape of an answer, and never the wording.
//
// An opinion is complete when it carries its outcome, at least two reasons, and
// the fields that were asked for. Whether the reasoning holds is for a reader.
//
// Nothing here reads a verdict out of prose. If the fixed shape did not arrive,
// the answer is malformed and that is the end of it: a salvaged verdict is
// indistinguishable from a real one, which makes it worse than no verdict at all.

import { VERDICT_VALUES, type Verdict } from "./charge-sheet.ts";

export const REASONS_MIN = 2;
export const REASONS_MAX = 5;
export const GROUND_MAX_CHARS = 400;

export type AdvocateOpinion = { position: Verdict; reasons: string[] };
export type JudgeOpinion = { verdict: Verdict; reasons: string[]; controlling_ground: string };

export type Parsed<T> = { ok: true; value: T } | { ok: false; why: string };

const isVerdict = (value: unknown): value is Verdict =>
  typeof value === "string" && (VERDICT_VALUES as readonly string[]).includes(value);

function readReasons(raw: unknown): string[] | string {
  if (!Array.isArray(raw)) return "reasons is not a list";
  if (raw.some((r) => typeof r !== "string" || r.trim().length === 0))
    return "a reason is empty or is not text";
  if (raw.length < REASONS_MIN) return `fewer than ${REASONS_MIN} reasons`;
  if (raw.length > REASONS_MAX) return `more than ${REASONS_MAX} reasons`;
  return raw.map((r) => (r as string).trim());
}

function asObject(text: string): Record<string, unknown> | string {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return "the answer was not JSON";
  }
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return "the answer was not a JSON object";
  return value as Record<string, unknown>;
}

export function parseAdvocate(text: string): Parsed<AdvocateOpinion> {
  const object = asObject(text);
  if (typeof object === "string") return { ok: false, why: object };

  if (!isVerdict(object["position"]))
    return { ok: false, why: "position is not one of the two values" };
  const reasons = readReasons(object["reasons"]);
  if (typeof reasons === "string") return { ok: false, why: reasons };

  return { ok: true, value: { position: object["position"], reasons } };
}

export function parseJudge(text: string): Parsed<JudgeOpinion> {
  const object = asObject(text);
  if (typeof object === "string") return { ok: false, why: object };

  if (!isVerdict(object["verdict"]))
    return { ok: false, why: "verdict is not one of the two values" };
  const reasons = readReasons(object["reasons"]);
  if (typeof reasons === "string") return { ok: false, why: reasons };

  // Presence and length only. What the ground says is a line of the opinion and
  // is not something a check is entitled to have an opinion about.
  const ground = object["controlling_ground"];
  if (typeof ground !== "string" || ground.trim().length === 0)
    return { ok: false, why: "controlling_ground is missing" };
  if (ground.trim().length > GROUND_MAX_CHARS)
    return { ok: false, why: `controlling_ground is longer than ${GROUND_MAX_CHARS} characters` };

  return {
    ok: true,
    value: { verdict: object["verdict"], reasons, controlling_ground: ground.trim() },
  };
}

/** The schemas sent to the provider, so that the shape is enforced under the
 *  prompt rather than requested inside it. */
export const ADVOCATE_SCHEMA = {
  type: "object",
  properties: {
    position: { type: "string", enum: [...VERDICT_VALUES] },
    reasons: { type: "array", items: { type: "string" }, minItems: REASONS_MIN, maxItems: REASONS_MAX },
  },
  required: ["position", "reasons"],
  additionalProperties: false,
} as const;

export const JUDGE_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: [...VERDICT_VALUES] },
    reasons: { type: "array", items: { type: "string" }, minItems: REASONS_MIN, maxItems: REASONS_MAX },
    controlling_ground: { type: "string" },
  },
  required: ["verdict", "reasons", "controlling_ground"],
  additionalProperties: false,
} as const;
