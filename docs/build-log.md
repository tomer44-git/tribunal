# Build log

Step 5 · ASE-26 running project · Tomer Ben Bassat

The plan in `docs/plan.md` is approved, the data model with it. This log records
what was built in what order, and why anything departed from the plan. It is
written as the work happens, not reconstructed afterwards.

The order is the one the plan sets: skeleton, schema, charge sheet rules,
submission and storage, one logged call, the advocate wave, the judge wave, failure
and the spare, the screen, the economics. Each is a commit or a short run of them,
and each leaves the project working.

Two things have to be settled before the first line, because both are rules I set
for myself and neither is mine to decide alone: what this project is allowed to
depend on, and who applies a schema change to the database.

**Nothing at runtime.** TypeScript, the Netlify function types and the Node type
definitions are development dependencies and none of them ships. Supabase and
OpenRouter are both reached with `fetch`, the tests run on Node's own test runner,
and the screen is written by hand. The project is small enough that this is
possible, and it turns *do not add a dependency without asking* from a rule to
remember into a state that is easy to keep.

**Schema changes are applied by me, in the Supabase editor, from a file in this
repository.** Approving a data model and letting an agent run `create table`
against the database are two different things. The record of every model call
cannot be reconstructed, so every change to the shape that holds it passes in front
of my own eyes first.

---

## 1 — The skeleton

`package.json`, `tsconfig.json`, and `netlify.toml`. Build settings moved out of the
Netlify interface and into the repository, where a change to them is a diff someone
can read.

A first function, `status`, reports whether the environment is complete. It does
not report which settings are missing: the endpoint is public, and a list of what a
server lacks is a map for anyone who wants one.

`@types/node` was added beyond the three dependencies agreed, because code that
reads `process.env` does not typecheck without it. It is types only and ships
nothing.

## 2 — The schema

Written as `db/001-initial-schema.sql` and run by hand. Three tables, and several
rules moved out of the application and into the database, where code cannot forget
them: the eight-call cap as `seq between 1 and 8` with a unique key on
`(deliberation_id, seq)`, one retry per deliberation as a partial unique index, and
a check that a call which is not complete carries neither a position nor a verdict.

**The server could not see its own tables.** Creating the project with "expose new
tables" off was right, but it granted nothing to anyone, and the first read with
the secret key came back `42501 permission denied`. `db/002-grant-server-access.sql`
grants what the application does and nothing else: insert and select on cases and
calls, update as well on deliberations, and no delete anywhere. **The server holds
the record of every model call and cannot remove any part of it.** Found by checking
from outside rather than by assuming, and found now rather than in two days as a
bug that looks like something else.

`db/checks/001-constraints.sql` puts seven forbidden rows to the database itself and
records what happened to each. All seven refused, `23514` for the checks and `23505`
for the retry index, and the script removes everything it created.

## 3 — The charge sheet rules

`src/charge-sheet.ts` holds every rule in `docs/charge-sheet-spec.md` and is
imported by both callers, compiled once to `dist/shared/` for the browser and read
directly by the function. One file, so the two can never disagree.

Writing the rules against the canonical case caught one of them being wrong. The
spec says the act alleged must name the accused, and T-001 accuses **Jon Snow** of
an act whose text names only **Jon** — a whole-name match would have refused the
one charge sheet the package fixes. The rule matches any part of the name instead.

Fourteen tests, no model call, nothing spent.

## 4 — Submission and storage

`src/config.ts` reads the seven models and the two secrets and reports every
missing name at once, to the function log and never to the caller: a list of what a
server lacks is a map for anyone who wants one. The eight-call cap is a constant in
that file rather than a variable, because a rule that can be raised by editing an
environment is not a rule.

`src/submit.ts` holds the decision and takes the store as an argument, so what
happens when a charge sheet arrives can be tested without a database. When the
database refuses a write, the message it returns can quote the row that failed, and
a row holds whatever a user typed — so the detail goes to the log and the caller
gets a bare 502.

Four commits went out with a test failing. The pipeline I was running hid the exit
code of `npm test` behind a `grep`. `CLAUDE.md` now says that no commit is pushed
without a green test run, and that a pipe which hides an exit code is not a test
run. The broken commits stand and the fixes sit after them.

`erasableSyntaxOnly` was turned on after the first of those: TypeScript accepts
`constructor(readonly x: T)` and Node, which only strips types, does not. The
compiler now refuses what the runtime cannot run.

## 5 — One call, logged

The prompts are turned into a module at build time by `scripts/build-prompts.mjs`.
A bundled function cannot reliably read files from the repository at run time, and
the markdown has to stay the only place a prompt is written.

**Three real calls were made and the first two failed. Both failures were worth
more than the run that succeeded.**

The first came back `finish_reason: length`, 1,984 completion tokens, of which
1,984 were reasoning tokens, and no content at all. `max_tokens` is a budget shared
between thinking and answering, and the model spent all of it thinking. The call
was paid for in full and returned nothing, and was recorded as malformed.

The second tried to switch reasoning off and the provider refused: *reasoning is
mandatory for this endpoint and cannot be disabled*. Five of the seven models
chosen are reasoning models, including all three judges, so this was never going to
be one agent's problem.

The third asked for brief reasoning and left room for the answer — `effort: low`,
`max_tokens: 4000` — and came back complete in four seconds on 523 output tokens
instead of 1,984. **The ceiling is free insurance; nothing is paid for a token that
is not produced. What controls the bill is the reasoning effort.**

Two things were confirmed on the way. OpenRouter reported the call's cost as
$0.00085455 and this project worked out $0.000855 from its own price lookup, which
means the economics are computed and not quoted. And the answering model is read
from the response rather than assumed, so a run that is routed elsewhere will say
so.

**The simulation rule was observed on the first successful call.** Jon Snow, in the
defence seat, returned `position: not justified` and argued against the side he was
seated on. That is the whole reason step 0 decided an advocate returns a position:
without the field, the most interesting thing this panel can do would have happened
silently.

## 6 and 7 — The two waves

The four advocates go out together and the three judges go out together after
them, each agent on its own model. Sequence numbers say what a call was: one to
four are the advocates in a fixed order, five to seven are the judges, and eight is
left free for the one spare.

**The first real advocate wave found the economics were wrong.** Cost was being
worked out from OpenRouter's published price list, and for two of the four agents
that list was not what the call was billed. `llama-3.3-70b` is listed at $0.71 per
million each way and was charged $0.25 in and $0.75 out, because a gateway routes
to whichever provider is serving the model and that provider sets its own price.
And `gpt-5-nano` was charged an effective input rate a seventh of its list price,
because the provider had seen the same prompt recently and discounted it.

So the rates are now taken from what was actually billed and the cost from the
figure the gateway reports. That always reconciles — tokens times rate is the cost,
by construction — and it is the only version of the economics that matches a bill.

There is an irony worth keeping for step 8. We concluded that caching cannot help a
panel where no two agents share a model, and inside one deliberation that is true.
But repeated smoke runs of the same prompt *were* discounted, which means these
measurements understate what a cold run costs.

**The first whole deliberation ran on 30 August: seven calls, seven complete, 20.2
seconds, $0.0344.**

Two of the four advocates reached the position their seat argues against, and they
were not the same two that crossed in the wave before. The crossing is not a fixed
property of one character. It is the simulation rule operating.

The three judges split two to one, and the single sentence each was asked for
carries three different methods rather than three summaries of one. Barak turned on
imminence and less harmful means. Elon reached the halakhic doctrine of the rodef
and treated Jewish law as a working legal source, which is what his profile says he
does. Shamgar refused the act on institutional grounds — a private individual
cannot execute a head of state — and never reached the moral question at all.
**That is the field earning its thirty tokens: three judges agreeing would look
identical in a table without it, and three judges disagreeing for the same reason
would be a collapsed panel wearing a healthy face.**

Two measurements against the essays, for step 8 to take up:

- **Tokens: 16,462 against a claim of roughly 17,000.** The claim holds.
- **Time: 20.2 seconds against a claim of about six.** The claim does not. The six
  seconds came from the course; two waves of parallel calls on seven different
  providers take three times that, and the judges are the slower half.

## 8 — Failure and the spare

Built as its own step rather than folded into the two waves, because it is the
behaviour most easily left half-done and hardest to notice missing.

`src/deliberate.ts` holds the rules that no single call can hold. The spare goes to
the first failure in a fixed agent order, so which agent claimed it never depends on
which one happened to answer first. There is one spare for the whole run: a
deliberation where an advocate needed a second ask sends its judges out with no net
under them, and the tests say so.

An advocate that is still not complete after the spare stops the run before the
judge wave and is named. The judges are the expensive half and, with fewer than four
submissions, they would be weighing a case no other run can be compared against.

A judge that fails leaves the other two standing. Its seat carries a failure and no
verdict, and the run is recorded as failed even though two opinions are returned and
will be shown. Those two sentences from `CLAUDE.md` are not in tension: the opinions
that arrived are displayed, and the run is never labelled finished.

The spend cap is enforced between the waves, where it can still save something. If
the advocates alone have reached it, the judges are never called.

Ten tests, none of them spending anything. The one worth naming asserts a negative:
after a run with a malformed judge and a failed one, no row that is not complete
carries a position, a verdict or a controlling ground. The database refuses those
rows as well, and neither check is relied on to cover the other.
