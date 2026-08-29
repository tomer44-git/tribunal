# Token economics

Step 8 · ASE-26 running project · Tomer Ben Bassat · 30 August 2026

Seventy-eight model calls, every one of them measured as it happened. The prices
here are not quoted from a price list: they are worked out from what the gateway
billed, which is the only version that reconciles with a statement.

---

## What each model cost, per call

Averages across the seven-model runs. Input and output are counted apart, and the
rate is the one actually charged.

| Seat | Model | Calls | Tokens in | Tokens out | $/M in | $/M out | Cost | Time |
|---|---|---|---|---|---|---|---|---|
| Jon Snow | `openai/gpt-5-nano` | 11 | 1,229 | 502 | 0.023 | 0.400 | $0.000229 | 4.0 s |
| Tyrion | `google/gemini-2.5-flash-lite` | 11 | 1,198 | 924 | 0.100 | 0.400 | $0.000489 | 5.3 s |
| Daenerys | `deepseek/deepseek-v4-flash` | 3 | 1,203 | 550 | 0.084 | 0.209 | $0.000231 | 6.7 s |
| Daenerys *(replaced)* | `mistralai/mistral-small-3.2-24b` | 5 | 1,204 | 203 | 0.078 | 0.220 | $0.000139 | 6.9 s |
| Grey Worm | `meta-llama/llama-3.3-70b-instruct` | 11 | 1,201 | 59 | 0.207 | 0.521 | $0.000278 | 2.7 s |
| Barak | `anthropic/claude-sonnet-5` | 7 | 3,543 | 432 | 2.000 | 10.000 | $0.011403 | 8.4 s |
| Elon | `openai/gpt-5.1` | 7 | 2,169 | 608 | 0.870 | 10.000 | $0.007969 | 9.4 s |
| Shamgar | `google/gemini-2.5-pro` | 7 | 2,119 | 985 | 1.250 | 10.000 | $0.012496 | 11.6 s |

**The judges are 97 per cent of the bill.** Four representatives cost about a tenth
of a cent between them; three judges cost about three and a half.

### Why the models were chosen

Every agent runs on its own model because Mikael asked for that. Within it: cheap
models for the four representatives, because building one side of an argument is
not the same work as weighing four of them, and three different providers for the
three judges — Anthropic, OpenAI, Google — so that three opinions are three
independent readings rather than one mind consulted three times. That last reason
turned out to be the important one, and it is measured below.

Daenerys was moved from `mistral-small-3.2-24b` to `deepseek-v4-flash` during step
7 after her provider refused three runs out of six with an upstream rate limit. The
old rows are kept above: a model that was replaced is part of the record.

---

## Three prices out of seven were not the list price

| Model | List | Actually billed |
|---|---|---|
| `openai/gpt-5-nano` | $0.05 in | **$0.023** in |
| `openai/gpt-5.1` | $1.25 in | **$0.870** in |
| `meta-llama/llama-3.3-70b` | $0.10 / $0.32 | **$0.207 / $0.521** |

Two of them were discounted because the provider had seen the same prompt recently
and cached it. One was dearer because the gateway routes to whichever provider is
serving that model and that provider sets its own price.

**Had the cost been computed from the published list, this table would be a
description of a bill nobody received.** It is the reason the rate is written onto
every row as the call happens.

## Tokens are not comparable across providers

Barak reads 3,543 input tokens where Shamgar reads 2,119 — for the same charge
sheet, the same four submissions and a profile of similar length. Neither is wrong.
Each provider counts with its own tokenizer, and the same text is a different
number of tokens depending on who is counting.

So "seventeen thousand tokens per case" is not a property of the case. It is a
property of the case and the seven models that read it.

---

## The progression: one model, then seven

| Configuration | Runs | Cost per run | Tokens | Wall clock | Judges split |
|---|---|---|---|---|---|
| Every agent on `gemini-2.5-flash-lite` | 1 | **$0.0039** | 18,657 | 14.9 s | **0 of 1** |
| Every agent on `claude-sonnet-5` | 2 | **$0.0672** | 22,908 | 17.9 s | **0 of 2** |
| **Seven models, one per agent** | 7 | **$0.0330** | 16,492 | 20.1 s | **5 of 7** |

### What the difference taught

**The seven-model panel costs half of the capable single model.** That is the
lever the Module 9 essay claimed, and it holds: putting the cheap work on cheap
models halves the bill.

**But the thing worth paying for is not the halving.** On one model the three
judges agreed in every run — three out of three — and on seven they disagreed in
five out of seven. Nothing about the prompts changed between those runs. The same
three judicial profiles, given one mind to run on, produced one opinion in three
voices.

The grounds show it more sharply than the verdicts. Across the seven-model runs
Elon reached the halakhic doctrine of the rodef in **seven runs out of seven**,
including both runs where he decided against the killing and applied the doctrine
to find it unmet. On a single model he reached it once in three, and in the other
two he wrote Barak's vocabulary — imminence, less harmful means — with no Jewish
law in it at all. Shamgar, who on seven models refuses on authority and never
reaches the moral question, on one model led with necessity like the other two.

**The representatives flattened too.** Across seven-model runs a representative
reached the position its seat argues against eight times. Across three single-model
runs it happened **not once**: four seats, one mind, four dutiful advocates.

So the finding is this. A panel of three judges on one model is not a panel. It is
one reader wearing three profiles, and its agreement means nothing, which is
exactly the failure `CLAUDE.md` warns about — *if all three judges agree every
time, the panel has failed, not succeeded.* **Model diversity is not a cost
decision here. It is what makes the disagreement real.**

Mikael asked for one model per agent. The measurement says he was right for a
reason neither of my essays anticipated.

---

## Against what I claimed

| Claim in `docs/02-cognified-economics.md` | Measured |
|---|---|
| Roughly seventeen thousand tokens per case | **16,492** — the claim holds |
| About six seconds against twenty-one | **20.1 s** — the claim does not hold |
| Caching pays, because all seven read the same sheet | **It cannot** — see below |
| The biggest lever is the choice of model | **True, and for a better reason than cost** |

**The timing claim was wrong by a factor of three.** Six seconds assumed two waves
of parallel calls behaving like two calls. In practice a wave finishes when its
slowest member finishes, and across seven providers the slowest is slow: Shamgar
averages 11.6 seconds alone. Two waves of parallel calls are not fast, they are
merely faster than seven in a row — which measured against 43 seconds of sequential
latency, so the parallel structure did save about half. It just never approached
six.

That error had a consequence rather than staying on paper. Twenty seconds does not
fit a ten-second synchronous function, and the panel had to move behind a job. The
essay named that remedy in advance, which is the only reason the correction was
cheap.

**The caching claim died with the seven-model decision.** A cache holds a prefix
for one model, and when no two agents share a model no model reads the charge sheet
twice in a deliberation. There is nothing to reuse. The length of the charge sheet
is paid seven times in full, which makes the word ceiling in
`docs/charge-sheet-spec.md` matter more than when it was written, not less.

There is one wrinkle worth naming, because it is visible in the table above. The
repeated tuning runs of an identical prompt *were* discounted by two providers, and
that discount is in these averages. A first run on a cold cache costs slightly more
than the figures here. The measurement understates by a little, and it understates
in the direction of honesty about which I would rather be wrong.

---

## What the whole thing cost

| | |
|---|---|
| Calls logged | 78 |
| Tokens | 104,353 in · 33,174 out |
| Total spent | **$0.37** |
| Ceiling set before the first call | $5 across two keys, $3 on the development key |
| A complete deliberation | **$0.033** |
| A run that fails in the advocate wave | **$0.001** — the judges are never called |
