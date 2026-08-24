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
tokens, so ten tuning runs are a hundred and seventy thousand. Tuning happens on
cheap models, and the capable ones come in only once the wording has settled.

**Stop when** the three judges sound genuinely unlike one another. Repeated
unanimity means the panel collapsed, whatever the verdicts say.

**Produces** → `docs/prompt-log.md` — why each edit was made, not what changed

---

## Step 8 — The progression to several models

Advocates on a cheap model, judges on a capable one — introduced as its own step
so that the progression is visible in the commits, which is an explicit
requirement.

**Emphasis.** Module 9: *the biggest lever is the choice of model.* And the
reason it is a lever here rather than a preference: building one side of an
argument is not the same work as weighing four of them.

**Token economics, and the strongest evidence in the project.** The essays claim
roughly seventeen thousand tokens per case and about six seconds against
twenty-one — figures taken from the course. By this point the log has measured
them.

    what I claimed  →  what I measured  →  what the difference taught

A document that sets a claim against a measurement proves that cost here is
architecture rather than a quotation.

**Produces** → `docs/token-economics.md` — cost per deliberation before and
after, and why each model was chosen

---

## Step 9 — Merge

The branch goes into `main` by my own hand, once the checks pass and the
documents are current.

**Emphasis.** Module 16: the full merge-readiness pack.

**Produces** → a clean `main`
