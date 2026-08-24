# Tribunal

Tribunal is the ASE-26 running project. A user submits a charge sheet; a panel of
four advocates and three judges deliberates; the output is three reasoned verdicts,
shown side by side and never combined.

The specification is fixed and shared: it is in `docs/case-package.pdf` and it is
not mine to revise. How this project is worked is in `docs/method.md`. Read both
before proposing anything.

## The record

The git history is as much a product of this project as the code. It is read and
judged on its own, so it is written on purpose and never left as a side effect.

Commit before you begin a step, not only after. A commit that exists before the
work is the record that the work was directed.

Push after every commit. A commit that only exists on this machine is not part of
the record.

One message, one change. A schema change and a screen change never share a
commit.

Say what actually changed. If it cannot be said in one line, the commit is too
big.

Never amend, squash, rebase or force push. A messy honest history is worth more
than a clean invented one.

Work stays on its branch until I merge it myself.

If you correct the same thing twice, stop and tell me — it belongs here as a rule,
not in the chat.

## Conventions

TypeScript throughout. Supabase (Postgres) for data, Netlify for hosting,
OpenRouter for models.

The seven prompts live one to a file in `prompts/`, so a change to one agent
shows up as its own diff and can be reviewed on its own.

A deliberation runs in two waves: the four advocates together, then the three
judges together. Judges wait for the advocates, not for each other.

Advocates run on a cheap model and judges on a capable one, because building one
side of an argument is not the same work as weighing four of them. The model
names live in config, not here.

The charge sheet is identical across all seven calls, so it is sent as the cached
part of the prompt.

## Boundaries

The OpenRouter key, the rubric and the seven prompts stay on the server. Nothing
that decides anything runs in the browser.

The model is used for two things only: building an argument and reaching a
verdict. Everything else — validation, storage, retrieval, totals, display — is
plain code.

Do not add a layer that merges, ranks or averages verdicts. Three verdicts go out
as three.

A deliberation may make at most eight model calls: seven for the panel, one spare
for a single retry. Cap what a single run may spend.

Keep the deliberation synchronous while it fits inside the function timeout. If it
stops fitting, move it behind a job rather than raising the timeout.

## What good work looks like

An opinion is complete when it carries a verdict, at least two reasons, and the
fields that were asked for. Check the shape of an answer, never the wording.
Whether the reasoning holds is mine to read.

When a call fails or returns something malformed, say so on the screen. A blank
field or a default verdict entering the record is the worst thing this system can
do.

Every model call gets its own row: the model, the verdict, the tokens, the cost,
the time. A call that ran and was not written down did not happen.

The browser may check a charge sheet for completeness so the user is not kept
waiting. The check that decides runs on the server, always.

Document what the code does. Do not invent why it is that way — if the reason is
not written down anywhere, ask me for it.

## Known traps

A judge may answer in prose instead of the format it was given. Ask for the fixed
shape twice, and check it on the way in.

A model call may time out. Retry once, then show the failure.

A charge sheet may arrive without its question. Reject it before any call is made.

A vague charge sheet produces four arguments about four different problems, and
then the three verdicts are not really disagreeing about the same thing. Nothing
errors. The output is simply worthless.

A charge sheet that is too short makes the advocates invent facts, because they
still have to build an argument. Judges then weigh reasoning that rests on
nothing.

If all three judges agree every time, the panel has failed, not succeeded.
Reasoned disagreement is the product. Treat unanimity as a signal to look at the
prompts.

Editing a prompt changes behaviour, not text. Do not touch one without asking me.

I joined this course halfway through. If something looks like a project convention
and has no written source, ask me — do not assume.

## When to stop and ask me

Do not change the database schema on your own. It holds the record of every call,
and a break in that record cannot be reconstructed later.

Do not add a dependency without asking. Each one is more surface to attack and
more to keep working.

Anything that adds a model call needs my approval, because it spends against the
cap and against the bill.

If the fix is turning into a rewrite, stop and tell me. A change larger than the
problem is a decision, not a repair.
