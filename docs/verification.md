# Verification

Step 6 · ASE-26 running project · Tomer Ben Bassat · 30 August 2026

Every check `docs/plan.md` names, run and reported as it came out. Two of them
failed. What failed and what changed because of it is here as well, because a
verification document that only records passes is not evidence of anything.

    npm run typecheck   pass
    npm test            88 tests, 88 pass, 0 fail
    npm run build       pass

---

## The checks that spend nothing

These run on recorded answers. No model is called and nothing is charged.

### The charge sheet

| Check | Result |
|---|---|
| A sheet without its question is refused, and no call is made | **pass** |
| Fewer than three agreed facts is refused | **pass** |
| Two identical agreed facts are refused | **pass** |
| Background under 150 or over 400 words is refused at both ends | **pass** |
| An act alleged under ten words is refused | **pass** |
| An act alleged that does not name the accused is refused | **pass** |
| A refusal names every field that failed, not the first | **pass** |
| The same rules give the same answer in the browser and on the server | **pass** |

The last is checked by importing the compiled browser copy and the server module
into one test and comparing their answers on seven sheets, so the two cannot drift
without a test going red.

Writing these rules against the canonical case corrected one of them. The spec
requires the act alleged to name the accused, and T-001 accuses **Jon Snow** of an
act whose text says only **Jon**. A whole-name match would have refused the one
charge sheet the package fixes.

### The shape of an answer

| Check | Result |
|---|---|
| An answer with one reason is malformed, not complete | **pass** |
| A judge answer missing `controlling_ground` is malformed | **pass** |
| A verdict outside the two fixed values is malformed | **pass** |
| Prose that says the killing was justified is malformed, and no verdict is taken from it | **pass** |
| JSON inside a code fence is malformed rather than repaired | **pass** |
| An advocate's shape from a judge, or the reverse, is malformed | **pass** |

### The rules of the panel

| Check | Result |
|---|---|
| A deliberation makes at most eight calls | **pass** |
| The spare is claimed by the first failure and is not available to the second | **pass** |
| A spare spent on an advocate leaves the judges with none | **pass** |
| An advocate that fails after its retry stops the run before the judge wave | **pass** |
| A judge that fails leaves the other two opinions standing | **pass** |
| A run with two opinions is shown, and is not presented as a finished result | **pass** |
| A run's totals equal the sum of its rows | **pass** |
| Nothing merges, ranks or averages the three verdicts | **pass** |

The last is checked by asserting an absence: the object handed to the screen carries
no majority and no summary, and `src/view.ts` contains no arithmetic except addition
of tokens and money.

---

## The checks against the database itself

Run against the live database with the server's own key, so that what is tested is
the constraint and not the code in front of it. Eight forbidden rows were offered
and eight were refused with `400`. Nothing was written: the call count on that run
was four before and four after.

| Row offered | Result |
|---|---|
| A failed call carrying a verdict | **refused** |
| An advocate carrying a verdict | **refused** |
| A judge carrying a position | **refused** |
| A complete call giving one reason | **refused** |
| A ninth call in one deliberation | **refused** |
| A verdict outside the two fixed values | **refused** |
| A judge seated on a side | **refused** |
| A complete call naming no answering model | **refused** |

`db/checks/001-constraints.sql` puts the same questions from inside the database and
was run in the SQL editor: seven of seven refused, `23514` for the checks and `23505`
for the partial unique index that holds the one-retry rule.

### Access

| Check | Result |
|---|---|
| The server reads the three tables | **pass** — 200 |
| A request with no key is refused | **pass** — 401 |
| The server is refused when it tries to delete | **pass** — 403 |

The server holds the record of every model call and cannot remove any part of it.

### Every row written so far

Eleven rows across two runs, read back and counted:

| Property | Count |
|---|---|
| Rows carrying both a position and a verdict | **0** |
| Rows not complete that carry an outcome | **0** |
| Complete rows naming no answering model | **0** |
| Rows with input and output tokens counted apart | **11 of 11** |

On the seven-call run: three verdicts and four positions. Seven outcomes exist, and
they sit in two columns, so the query that counts a case's outcomes returns three or
four and never seven.

---

## The check that spends

One deliberation of case T-001 against the real seven models, on 29 August.

| Check | Result |
|---|---|
| Seven calls, seven rows | **pass** |
| Seven models named in the responses | **pass** |
| Three opinions in the fixed shape | **pass** |
| No call was routed to a model other than the one asked for | **pass** — 0 of 11 |
| The run's cost lands under `MAX_USD_PER_DELIBERATION` | **pass** — $0.034381 against $0.25 |
| The whole deliberation finishes inside the function timeout | **fail** — see below |

Measured: 16,462 tokens, $0.034381, 20.2 seconds. Against the essays: the claim of
roughly seventeen thousand tokens holds; the claim of about six seconds does not.

---

## What failed

### The deliberation does not fit a synchronous function

20.2 seconds for the run, and 11.1 seconds for the slowest single call, against a
ten-second limit. Even one judge exceeds it alone, so no arrangement of waves saves
it.

`docs/01-architecture.md` set the condition and named the remedy before either was
needed: keep it synchronous while it fits, and move it behind a job when it stops.
It has moved. `deliberate-background` answers 202 at once and may run for fifteen
minutes, which Netlify allows on the free plan, and the browser asks `runs` once a
second what the server has written down.

No document was reversed. The contingency fired and was followed.

### Two smoke runs were left marked as still running

Both deliberations in the database still read `status: running` with no
`finished_at`. The scripts that made them were written before `src/deliberate.ts`
existed and never set the status; only the orchestrator does. The rows are correct
and the calls are all recorded — what is missing is the closing update, and the code
that performs it has never run against real providers.

---

## What is not yet verified

Recorded plainly rather than left to be discovered.

- **The functions have never been invoked.** `cases`, `runs` and
  `deliberate-background` are covered by tests of the modules they call, and by a
  charge-sheet check exercised in a real browser, but no request has reached a
  deployed function.
- **The orchestrator has never run against real providers.** Its rules — the single
  spare, stopping before the judge wave, marking the run — are covered by ten tests
  on scripted answers. The seven-call run that did happen went through the two waves
  directly, without it.
- **The retry has never been spent on a real failure.** It has been made to happen
  in tests and has not yet happened in the world.

None of these can be closed without either `netlify dev` or a deployment, and the
deployment waits for step 9. They are the gate: no merge until a real run goes
through the functions end to end.

---

## The gate, closed

30 August, under `netlify dev`, against the real database and the real seven
models. All four functions loaded and `status` answered `{"status":"ok","config":
"complete"}`, which is the first proof that the environment is whole.

One charge sheet was then put to the panel **from the page, in a browser**, and the
whole path ran: `cases` stored it as `C-A0FDF4`, `runs` opened the deliberation,
`deliberate-background` answered 202 and ran the panel behind the request, and the
page polled `runs` once a second and drew what the server had written.

| Check | Result |
|---|---|
| The functions answer a real request | **pass** |
| A charge sheet posted from the page is stored | **pass** |
| The background function runs the panel and closes the run | **pass** — `status: complete`, `retry_used: false` |
| The page shows the run progressing, then the result | **pass** — cards landed while the panel sat |
| Seven calls, no retry, no failure | **pass** |
| Four arguments shown by name and seat | **pass** — Jon Snow · defence seat, and so on |
| Three opinions side by side, each with its controlling ground | **pass** |
| The economics table and totals appear under them | **pass** |

    7 calls · 12,760 tokens in · 3,867 out · $0.033941 · 21.4 seconds

The three judges came down the same way this time and reached it three different
ways: Barak on least harmful means, Elon on the necessity and rodef standard,
Shamgar on the absence of any lawful authority to kill a sovereign. Unanimity in one
run out of eight is not the failure `CLAUDE.md` describes; agreement for one reason
would have been.

**Every gap listed above is closed.** The orchestrator, the retry rule and the
failure rules had already run against real providers nine times during step 7,
including one real `429` that spent the spare and stopped the run before the judge
wave. What was missing was the path through the functions and the page, and that
has now run end to end.
