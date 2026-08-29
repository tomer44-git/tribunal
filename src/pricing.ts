// What a model costs, taken from OpenRouter rather than from a table in this repo.
//
// Prices move. A price written down here would be wrong within weeks and the
// economics would be wrong with it, so the list is fetched and the two prices are
// written onto the call as it happens. The lookup is free and is not a model call:
// it spends nothing and counts against nothing.

const MODELS_URL = "https://openrouter.ai/api/v1/models";

export type Price = { inPerMillion: number; outPerMillion: number };

let cache: Map<string, Price> | null = null;

const perMillion = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n * 1_000_000 : 0;
};

export async function loadPrices(fetchImpl: typeof fetch = fetch): Promise<Map<string, Price>> {
  if (cache) return cache;
  const response = await fetchImpl(MODELS_URL);
  if (!response.ok) throw new Error(`the model list came back ${response.status}`);
  const body = (await response.json()) as { data?: { id: string; pricing?: Record<string, unknown> }[] };
  const prices = new Map<string, Price>();
  for (const model of body.data ?? []) {
    prices.set(model.id, {
      inPerMillion: perMillion(model.pricing?.["prompt"]),
      outPerMillion: perMillion(model.pricing?.["completion"]),
    });
  }
  cache = prices;
  return prices;
}

/** Forget the list. Used by tests, and by nothing else. */
export function forgetPrices(): void {
  cache = null;
}

export function costOf(price: Price | undefined, tokensIn: number, tokensOut: number): number | null {
  if (!price) return null;
  return (tokensIn * price.inPerMillion + tokensOut * price.outPerMillion) / 1_000_000;
}
