# How this project is built

ASE-26 running project · Tomer Ben Bassat · August 2026

The specification for Tribunal is fixed and shared: the panel, the protocol that
refuses to combine the verdicts, the charge sheet, the cases, and the models
reached through OpenRouter. It is not mine to revise.

That is the whole reason this project is worked differently from my own one.
There, the spiral turned on the framing, because I was discovering the problem by
building. Here the problem is given, so nine of these steps run in a line — and
exactly one of them is a spiral. It turns on the prompts, because the prompts are
the only thing in this project whose right shape has to be found rather than
read.

Two documents from the essays already commit me: `docs/01-architecture.md` and
`docs/02-cognified-economics.md`. Where they and this method disagree, that is a
change of mind and it gets written down, not smoothed over.

---

## Step 0 — Close the open decisions

Mikael's information package fixes the four advocates, the three judicial
profiles, the canonical charge sheet, and the two verdict values. What it leaves
to me is the structured output format and what follows from it. Those are settled
in writing, with a reason for each, before anything is built.

**Emphasis.** Module 4: *every fixed decision is one the agent won't guess, and
thin specifications get filled with hidden assumptions.* Module 10: *one sentence
per decision the agent faces.*

**Produces** → `docs/decisions.md`

---

## Step 1 — Infrastructure

An OpenRouter account and key, a Supabase project, a Netlify site, and `CLAUDE.md`
updated with everything settled in step 0. No thinking here, only the removal of
blockers, which is why it comes early.

**Emphasis.** Module 7: the key lives on the server and never reaches the browser.
Module 9: the caps are set before the first call, not after the first bill — *a
loop can spend faster than anyone is watching.*

**Produces** → `.env.example`, an updated `CLAUDE.md`

---

## Step 2 — The charge sheet specification

The fields, what counts as complete, and what is rejected before any call is
made. This is an explicit requirement — the charge sheet is written as a
specification and not as free text — and it depends on nothing else, so it can be
done immediately.

**Emphasis.** Module 10's five parts: the goal and its reason, testable success
criteria, architectural guidance, the validation approach, and the known
pitfalls. One of those pitfalls is named for this project: *a charge sheet may
arrive without its question — reject it before any call is made.*

Module 9 gives the second reason to take this seriously: *a vague charge sheet
produces four arguments about four different problems, and then the three
verdicts are not really disagreeing about the same thing.* Validation here is not
politeness. It is what stops seventeen thousand tokens being spent on nothing.

**Produces** → `docs/charge-sheet-spec.md`

---

## Step 3 — The seven prompts

One file per agent in `prompts/`, written from the character profiles in the
information package. The simulation rule is enforced in the wording: the seat
fixes the procedural role and never the conclusion. An advocate in the defence
seat may end up arguing that the killing was not justified, and the prompt must
allow that.

**Emphasis.** Module 9: *behaviour lives in the prompts, not the code. Treat
prompts as code, versioned and reviewed.* Module 11: critical rules go at the
beginning or the end and never in the middle, and every context token is
processed on every call — a long prompt is a recurring tax.

**Token economics, first appearance.** The charge sheet is identical across all
seven calls, so it is sent as the cached part of the prompt: charged once, then
reused.

**Produces** → `prompts/`, seven files

---

## Step 4 — The build plan

The data model, the ordered steps, and the checks the build will be measured
against — approved before a line of code. This is the same shape that worked on
my own project.

**Emphasis.** Module 3: *reading the plan is the cheapest verification step.*
Module 14: decomposition and orchestration, where tokens are the constraint.

**Produces** → `docs/plan.md`

---

## Step 5 — Build

A commit before each step, one change to a message, a push after each one. Module
4's seven parts apply to every piece of work: intent, specification, context,
plan, execution, verification, audit trail.

**Emphasis.** Module 9 makes the log a requirement rather than an addition: *every
model call gets its own row — the model, the verdict, the tokens, the cost, the
time. A call that ran and was not written down did not happen.*

**Token economics.** The cap is enforced in code: at most eight model calls per
deliberation, seven for the panel and one spare for a single retry.

**Produces** → commits, `docs/build-log.md`

---

## Step 6 — Verification

Run the checks, report each as pass or fail, write the results down.

**Emphasis.** Module 13: *no gate, no merge.* Module 9: *check the shape before
you trust it* — and remember that a form check catches the malformed answer but
never the well-formed wrong one.

The check that matters most comes from Module 8: *a blank field or a default
verdict entering the record is the worst thing this system can do.* A parse
failure is shown as a failure and never as a verdict.

**Produces** → `docs/verification.md`

---

## Step 7 — The spiral, and it is the only one

    run a case  →  read the three opinions  →  correct a prompt  →  run again

This is the loop that turns, and it turns on the prompts rather than on the
specification, because the specification is Mikael's and not mine. Every
correction is recorded with the reason that produced it, and the history of
`prompts/` is the evidence that I read output and judged it rather than accepting
it.

**Emphasis.** From my own `CLAUDE.md`: *if all three judges agree every time, the
panel has failed, not succeeded. Treat unanimity as a signal to look at the
prompts.* And Module 9: *a careless prompt edit is a real fault.*

**Token economics, made concrete.** Each run is roughly seventeen thousand
tokens, so ten tuning runs are a hundred and seventy thousand.

**I said tuning would happen on cheap models and the capable ones would come in
only once the wording had settled. I have changed my mind, and this is where it is
written down.** That plan was made when the judges were one capable model and a
run was the largest line in the bill. With seven models chosen for what they are
rather than for what they cost, a measured run is three and a half cents, and
tuning on substitutes would save three cents while producing readings that cannot
be compared to the run Mikael will see. Format reliability differs, answer length
differs, and how a judge reasons — which is the entire thing being read — differs
most of all. Ten runs on the real seven are thirty-four cents against a three
dollar ceiling. The advice was right about the money and the money moved.

**Stop when** the three judges sound genuinely unlike one another. Repeated
unanimity means the panel collapsed, whatever the verdicts say.

**Produces** → `docs/prompt-log.md` — why each edit was made, not what changed

---

## Step 8 — The progression to seven models

One model for all seven agents first, then a separate model for each of the seven.
It is its own step so that the progression is visible in the commits, which is an
explicit requirement.

**This is a change of mind and it is written down rather than smoothed over.** This
step used to read as two models — a cheap one for the four representatives, a
capable one for the three judges — and `docs/02-cognified-economics.md` argues for
exactly that split. The essay stands as it was submitted. Mikael has since said
that several models means one model per agent, so seven is the end state and the
two-way split becomes a stage on the way rather than the destination.

**Emphasis.** Module 9: *the biggest lever is the choice of model.* The lever is
the same one. There are simply seven of them now.

**What the change costs.** Prompt caching stops paying. A cache holds a prefix for
one model, and when no two agents share a model each one sees the identical charge
sheet exactly once in a deliberation — a write with no read behind it, and on some
providers a write costs more than plain input. `CLAUDE.md` is corrected to say so.
The shared blocks in `prompts/` stay, for the other reason they were written: one
source that cannot drift into seven near-copies.

**What the change buys.** Three judges on three different models are three
independent readings. On one model they share the same dispositions, and their
agreement proves less than it appears to. Unanimity is the failure this panel is
most at risk of, and this is the one change that works against it without touching
a prompt.

**Token economics, and the strongest evidence in the project.** The essays claim
roughly seventeen thousand tokens per case and about six seconds against
twenty-one — figures taken from the course. By this point the log has measured them
per agent and per model, with input and output counted separately, so that the
price of each can be shown rather than asserted.

    what I claimed  →  what I measured  →  what the difference taught

A document that sets a claim against a measurement proves that cost here is
architecture rather than a quotation.

**Produces** → `docs/token-economics.md` — for every model: price per million in
and out, tokens in and out actually spent, cost, and time; then one deliberation on
a single model set against the same deliberation on seven, and the reason each
model was chosen

---

## Step 9 — Merge

The branch goes into `main` by my own hand, once the checks pass and the
documents are current.

**Emphasis.** Module 16: the full merge-readiness pack.

**Produces** → a clean `main`
