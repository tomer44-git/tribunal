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
const MAX_TOKENS = 4000;

/** Five of the seven models chosen are reasoning models, and hidden reasoning is
 *  billed as output — which is most of what a deliberation costs. The first real
 *  call proved the sharper problem: the model spent all 1,984 of its output tokens
 *  thinking, wrote nothing, and had to be recorded as malformed. The second proved
 *  that reasoning cannot simply be switched off: the provider answered
 *  "reasoning is mandatory for this endpoint and cannot be disabled".
 *
 *  So it is asked to be brief instead. The panel's product is an argument or a
 *  verdict in a fixed shape, not a long deliberation nobody reads. If an agent
 *  ever needs to think at length, that is turned on for that agent on purpose and
 *  paid for knowingly. */
const REASONING = { effort: "low" } as const;

/** How long a single call may take before it is abandoned.
 *
 *  Measured across 110 calls that succeeded: the slowest finished in 15.9 seconds,
 *  the median in 6.2. The only call ever to run longer took 68 seconds and came
 *  back malformed — it was not slow and useful, it was slow and worthless, and
 *  three agents that had already answered waited more than a minute for it.
 *
 *  Thirty seconds is roughly twice the slowest answer this project has ever had.
 *  Passing it invents no new behaviour: the call becomes a failure and the failure
 *  rules take over unchanged. What the deadline buys is that the one spare can be
 *  spent at all, because a call that has not finished failing cannot be retried. */
export const CALL_DEADLINE_MS = 30_000;

export type CallResult = {
  /** The model named in the response. A gateway can route elsewhere, and a log of
   *  what was asked describes a run that did not happen. */
  modelAnswered: string | null;
  content: string | null;
  tokensIn: number;
  tokensOut: number;
  /** What the call actually cost, as the gateway reports it, and how that cost
   *  splits between input and output. This is the billed figure and not a price
   *  list, which matters: the published price of a model is neither what every
   *  provider serving it charges nor what a cached prompt is charged. */
  costUsd: number | null;
  costIn: number | null;
  costOut: number | null;
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
    /** Tests set this short so that a suite is not held up for thirty seconds. */
    deadlineMs?: number;
    fetchImpl?: typeof fetch;
  },
): Promise<CallResult> {
  const started = Date.now();
  const send = options.fetchImpl ?? fetch;
  const deadline = AbortSignal.timeout(options.deadlineMs ?? CALL_DEADLINE_MS);

  let response: Response;
  let text: string;
  try {
    response = await send(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.openrouterKey}`,
        "content-type": "application/json",
      },
      signal: options.signal ? AbortSignal.any([options.signal, deadline]) : deadline,
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
    // Say whose deadline it was. A call this project abandoned and a provider that
    // went quiet are different failures, and the log has to tell them apart.
    const timedOut = deadline.aborted;
    throw new CallFailed(
      timedOut
        ? `the call passed its ${(options.deadlineMs ?? CALL_DEADLINE_MS) / 1000} second deadline`
        : error instanceof Error
          ? error.message
          : "the call did not complete",
      Date.now() - started,
      "",
    );
  }

  const latencyMs = Date.now() - started;
  if (!response.ok) throw new CallFailed(`the provider answered ${response.status}`, latencyMs, text);

  let body: {
    model?: string;
    choices?: { message?: { content?: string } }[];
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      cost?: number;
      cost_details?: {
        upstream_inference_prompt_cost?: number;
        upstream_inference_completions_cost?: number;
      };
    };
    error?: { message?: string };
  };
  try {
    body = JSON.parse(text);
  } catch {
    throw new CallFailed("the provider did not answer with JSON", latencyMs, text);
  }

  if (body.error) throw new CallFailed(body.error.message ?? "the provider reported an error", latencyMs, text);

  const details = body.usage?.cost_details;
  const number = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;

  return {
    modelAnswered: body.model ?? null,
    content: body.choices?.[0]?.message?.content ?? null,
    tokensIn: body.usage?.prompt_tokens ?? 0,
    tokensOut: body.usage?.completion_tokens ?? 0,
    costUsd: number(body.usage?.cost),
    costIn: number(details?.upstream_inference_prompt_cost),
    costOut: number(details?.upstream_inference_completions_cost),
    latencyMs,
    raw: text,
  };
}
