// Proves the function path is reachable and the environment is complete, without
// disclosing anything about it. The names of missing settings are not returned:
// this endpoint is public, and a list of what a server is missing is a map.
const REQUIRED = [
  "OPENROUTER_API_KEY",
  "SUPABASE_URL",
  "SUPABASE_SECRET_KEY",
  "MODEL_ADVOCATE_JON",
  "MODEL_ADVOCATE_TYRION",
  "MODEL_ADVOCATE_DAENERYS",
  "MODEL_ADVOCATE_GREY_WORM",
  "MODEL_JUDGE_BARAK",
  "MODEL_JUDGE_ELON",
  "MODEL_JUDGE_SHAMGAR",
] as const;

export default async (): Promise<Response> => {
  const complete = REQUIRED.every((name) => (process.env[name] ?? "").length > 0);
  return Response.json({ status: "ok", config: complete ? "complete" : "incomplete" });
};
