// Everything the server needs from its environment, read once and checked once.
//
// Nothing here reaches the browser. The OpenRouter key, the Supabase secret and
// the seven model names are read inside the function and stay there.

export const AGENTS = [
  "jon",
  "tyrion",
  "daenerys",
  "grey_worm",
  "barak",
  "elon",
  "shamgar",
] as const;
export type Agent = (typeof AGENTS)[number];

export const ADVOCATES = ["jon", "tyrion", "daenerys", "grey_worm"] as const;
export const JUDGES = ["barak", "elon", "shamgar"] as const;

/** Which seat each advocate argues from. The seat fixes the procedural role and
 *  never the position — that rule belongs to the prompts, and this is only the
 *  seating plan. */
export const SEAT_OF: Record<(typeof ADVOCATES)[number], "defence" | "prosecution"> = {
  jon: "defence",
  tyrion: "defence",
  daenerys: "prosecution",
  grey_worm: "prosecution",
};

const MODEL_VAR: Record<Agent, string> = {
  jon: "MODEL_ADVOCATE_JON",
  tyrion: "MODEL_ADVOCATE_TYRION",
  daenerys: "MODEL_ADVOCATE_DAENERYS",
  grey_worm: "MODEL_ADVOCATE_GREY_WORM",
  barak: "MODEL_JUDGE_BARAK",
  elon: "MODEL_JUDGE_ELON",
  shamgar: "MODEL_JUDGE_SHAMGAR",
};

export type Config = {
  supabaseUrl: string;
  supabaseSecretKey: string;
  openrouterKey: string;
  models: Record<Agent, string>;
  maxUsdPerDeliberation: number;
};

/** The eight-call cap is here rather than in the environment. Seven panel calls
 *  and one spare is a rule, not a setting, and a rule that can be raised by
 *  editing a variable is not a rule. */
export const MAX_CALLS_PER_DELIBERATION = 8;

export class MissingConfig extends Error {
  constructor(readonly names: string[]) {
    super(`missing configuration: ${names.join(", ")}`);
    this.name = "MissingConfig";
  }
}

const read = (env: Record<string, string | undefined>, name: string, missing: string[]): string => {
  const value = (env[name] ?? "").trim();
  if (value.length === 0) missing.push(name);
  return value;
};

export function readConfig(env: Record<string, string | undefined> = process.env): Config {
  const missing: string[] = [];
  const supabaseUrl = read(env, "SUPABASE_URL", missing).replace(/\/+$/, "");
  const supabaseSecretKey = read(env, "SUPABASE_SECRET_KEY", missing);
  const openrouterKey = read(env, "OPENROUTER_API_KEY", missing);

  const models = {} as Record<Agent, string>;
  for (const agent of AGENTS) models[agent] = read(env, MODEL_VAR[agent], missing);

  const capText = (env["MAX_USD_PER_DELIBERATION"] ?? "").trim();
  const cap = Number(capText);
  if (capText.length === 0) missing.push("MAX_USD_PER_DELIBERATION");
  else if (!Number.isFinite(cap) || cap <= 0) missing.push("MAX_USD_PER_DELIBERATION");

  if (missing.length > 0) throw new MissingConfig(missing);
  return { supabaseUrl, supabaseSecretKey, openrouterKey, models, maxUsdPerDeliberation: cap };
}
