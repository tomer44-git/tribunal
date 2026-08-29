import { test } from "node:test";
import assert from "node:assert/strict";
import { callModel, CallFailed } from "../src/openrouter.ts";
import { loadPrices, forgetPrices, costOf } from "../src/pricing.ts";
import type { Config } from "../src/config.ts";

const config = { openrouterKey: "sk-or-v1-test" } as Config;

const replyWith = (status: number, body: unknown): typeof fetch =>
  (async () =>
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status })) as typeof fetch;

test("the model named in the response is what comes back, not the one asked for", async () => {
  const result = await callModel(config, {
    model: "asked/for-this",
    prompt: "p",
    schema: {},
    schemaName: "s",
    fetchImpl: replyWith(200, {
      model: "answered/with-that",
      choices: [{ message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 11, completion_tokens: 22 },
    }),
  });
  assert.equal(result.modelAnswered, "answered/with-that");
  assert.equal(result.tokensIn, 11);
  assert.equal(result.tokensOut, 22);
});

test("tokens in and out are kept apart and never summed", async () => {
  const result = await callModel(config, {
    model: "m",
    prompt: "p",
    schema: {},
    schemaName: "s",
    fetchImpl: replyWith(200, {
      model: "m",
      choices: [{ message: { content: "{}" } }],
      usage: { prompt_tokens: 1000, completion_tokens: 7 },
    }),
  });
  assert.equal(result.tokensIn, 1000);
  assert.equal(result.tokensOut, 7);
});

test("a provider error is a failure and never a verdict", async () => {
  await assert.rejects(
    () => callModel(config, { model: "m", prompt: "p", schema: {}, schemaName: "s", fetchImpl: replyWith(429, "slow down") }),
    CallFailed,
  );
  await assert.rejects(
    () =>
      callModel(config, {
        model: "m",
        prompt: "p",
        schema: {},
        schemaName: "s",
        fetchImpl: replyWith(200, { error: { message: "no capacity" } }),
      }),
    CallFailed,
  );
});

test("a body that is not JSON is a failure", async () => {
  await assert.rejects(
    () => callModel(config, { model: "m", prompt: "p", schema: {}, schemaName: "s", fetchImpl: replyWith(200, "<html>") }),
    CallFailed,
  );
});

test("prices come back per million and cost is worked out from them", async () => {
  forgetPrices();
  const prices = await loadPrices(
    replyWith(200, {
      data: [{ id: "a/model", pricing: { prompt: "0.0000001", completion: "0.0000004" } }],
    }),
  );
  const price = prices.get("a/model");
  // Floating point: 0.0000001 * 1e6 is not exactly 0.1, and pretending otherwise
  // would be a test that lies about arithmetic rather than about the code.
  assert.ok(Math.abs(price!.inPerMillion - 0.1) < 1e-9);
  assert.ok(Math.abs(price!.outPerMillion - 0.4) < 1e-9);
  assert.ok(Math.abs(costOf(price, 1_000_000, 1_000_000)! - 0.5) < 1e-9);
  assert.equal(costOf(undefined, 10, 10), null);
  forgetPrices();
});
