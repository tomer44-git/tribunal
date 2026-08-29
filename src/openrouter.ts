// One call to one model.
//
// The shape is enforced by asking the provider for it, not only by asking for it
// in the prompt. What comes back is returned whole, parsed by nobody here: this
// module reports what happened and the caller decides what it means.

import type { Config } from "./config.ts";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/** A distant safety net. The real ceiling is in the wording of the prompts, because
 *  a token limit reached is an answer truncated mid-string, which is a parse
 *  failure we caused ourselves. */
const MAX_TOKENS = 2000;

/** Hidden reasoning is billed as output, and output is most of what a deliberation
 *  costs. The first real call proved the sharper problem: a reasoning model spent
 *  all 1,984 of its output tokens thinking and returned no answer at all, which
 *  this system is obliged to record as malformed. The panel's product is the
 *  argument and the verdict, both in a fixed shape. If an agent ever needs to
 *  think at length, that is turned on for that agent on purpose and paid for
 *  knowingly. */
const REASONING = { enabled: false } as const;

export type CallResult = {
  /** The model named in the response. A gateway can route elsewhere, and a log of
   *  what was asked describes a run that did not happen. */
  modelAnswered: string | null;
  content: string | null;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
  raw: string;
};

export class CallFailed extends Error {
  readonly latencyMs: number;
  readonly raw: string;
  constructor(message: string, latencyMs: number, raw: string) {
    super(message);
    this.name = "CallFailed";
    this.latencyMs = latencyMs;
    this.raw = raw;
  }
}

export async function callModel(
  config: Config,
  options: {
    model: string;
    prompt: string;
    schema: unknown;
    schemaName: string;
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
  },
): Promise<CallResult> {
  const started = Date.now();
  const send = options.fetchImpl ?? fetch;

  let response: Response;
  let text: string;
  try {
    response = await send(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.openrouterKey}`,
        "content-type": "application/json",
      },
      signal: options.signal ?? null,
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: "user", content: options.prompt }],
        max_tokens: MAX_TOKENS,
        response_format: {
          type: "json_schema",
          json_schema: { name: options.schemaName, strict: true, schema: options.schema },
        },
        reasoning: REASONING,
        usage: { include: true },
      }),
    });
    text = await response.text();
  } catch (error) {
    throw new CallFailed(
      error instanceof Error ? error.message : "the call did not complete",
      Date.now() - started,
      "",
    );
  }

  const latencyMs = Date.now() - started;
  if (!response.ok) throw new CallFailed(`the provider answered ${response.status}`, latencyMs, text);

  let body: {
    model?: string;
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string };
  };
  try {
    body = JSON.parse(text);
  } catch {
    throw new CallFailed("the provider did not answer with JSON", latencyMs, text);
  }

  if (body.error) throw new CallFailed(body.error.message ?? "the provider reported an error", latencyMs, text);

  return {
    modelAnswered: body.model ?? null,
    content: body.choices?.[0]?.message?.content ?? null,
    tokensIn: body.usage?.prompt_tokens ?? 0,
    tokensOut: body.usage?.completion_tokens ?? 0,
    latencyMs,
    raw: text,
  };
}
