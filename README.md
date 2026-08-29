# Tribunal

ASE-26 running project.

A charge sheet is put to four representatives and three judges. The representatives
argue it, the judges decide it, and three reasoned verdicts come back. They are
shown side by side and are never combined into one.

Seven agents, seven models, two waves, at most eight model calls. A complete
deliberation costs about three and a half cents and takes about twenty seconds.

## How this was worked

Nine steps, eight of them in a line and one a spiral. Each closed with a commit and
carries a tag, so the history can be read a step at a time: `git tag -n1 -l 'step-*'`.

- [How this project is built](docs/method.md) — the method, and why it differs from my own project
- [The decisions](docs/decisions.md) — the five questions the package left open, and how each was settled
- [The charge sheet specification](docs/charge-sheet-spec.md) — the fields, what counts as complete, what is refused before any call
- [The build plan](docs/plan.md) — data model, order of work, and the checks the build was measured against
- [The build log](docs/build-log.md) — what was built, in what order, and what went wrong on the way
- [Verification](docs/verification.md) — every check reported, including the two that failed
- [The prompt log](docs/prompt-log.md) — the spiral: why each prompt edit was made
- [Token economics](docs/token-economics.md) — what each model cost, and one model measured against seven

## Design rationale

Two essays, submitted before the build and left as they were written. Where the
measurements contradict them, the contradiction is recorded rather than smoothed
over.

- [Tribunal as a web application](docs/01-architecture.md)
- [Tribunal as cognified software](docs/02-cognified-economics.md)

## The specification

`docs/case-package.pdf` is Mikael's information package. It fixes the four
representatives and their profiles, the three judicial profiles, the canonical
charge sheet for case T-001, the two verdict values, and the simulation rule that
an assigned seat fixes only a procedural role and never a position. It is not mine
to revise.

## The panel

The seven prompts live one to a file in [`prompts/`](prompts/), so a change to one
agent is its own diff. [`prompts/README.md`](prompts/README.md) says how a prompt is
assembled and what was decided about its shape.

## Running it

The OpenRouter key, the rubric and the seven prompts stay on the server. Nothing
that decides anything runs in the browser.

    cp .env.example .env     # then fill in the three secrets
    npm install
    npm run build            # the browser's copy of the charge sheet rules
    npm test                 # 91 checks, no model calls, nothing spent
    npx netlify dev          # the app, against real models and a real database

The build comes before the tests on purpose. One check compares the browser's copy
of the charge sheet rules against the server's, and it can only do that once the
build has emitted the browser copy. Without it that check skips rather than fails,
which is the quietest way for a test suite to lie.

The schema is in [`db/`](db/) and is applied by hand. `db/checks/001-constraints.sql`
asks the database whether it still refuses what it is supposed to refuse.
