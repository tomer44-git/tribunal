# The build plan

Step 4 · ASE-26 running project · Tomer Ben Bassat

Nothing is built until this document is approved. The data model, the order of the
work, and the checks the build will be measured against are settled here, because
reading a plan is the cheapest verification step there is.

Most of what this plan has to serve is already decided and is not reopened here.
Seven agents in two waves, at most eight model calls, one retry for the whole
deliberation. An advocate returns a `position`, a judge returns a verdict, at least
two reasons and a `controlling_ground`. A judge's verdict and an advocate's position
are recorded apart from each other and never counted together. Every model call gets
its own row, carrying its own status, and the row names the model that answered
rather than the model that was asked. Seven agents now run on seven models, so the
record has to explain the cost of each one separately — Mikael asked for the full
economics per model, input and output apart.

What was open was the shape of the record that carries all of it, and the order in
which it gets built. Both are settled below.

---

## The data model

Three tables. Row-level security is on and no policy is written for any of them, so
nothing reaches them except the server holding the secret key.

### `cases`

The charge sheet, stored as the fields `docs/charge-sheet-spec.md` defines and not
as prose.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `reference` | text | unique — `T-001` for the canonical case |
| `accused` | text | required |
| `deceased` | text | nullable; a killing has one, not every case does |
| `act_alleged` | text | required |
| `background` | text | required |
| `agreed_facts` | text[] | required, ordered |
| `question` | text | required |
| `created_at` | timestamptz | |

The agreed facts are an array rather than a child table. Postgres can count the
elements of an array, so the floor of three facts is a constraint the database
holds rather than a rule the application remembers to apply. If a later step needs
an argument to cite one fact by itself, that is a small migration and not a
rewrite.

The verdict values are not stored anywhere. The package fixes them at justified and
not justified, so they are a constant in code and never a row a user could add to.

### `deliberations`

One row for one run of the panel.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `case_id` | uuid | → `cases` |
| `status` | text | `running`, `complete`, `failed` |
| `failed_at_wave` | text | `advocates` or `judges`, null unless failed |
| `retry_used` | boolean | the one spare call, spent or not |
| `started_at` / `finished_at` | timestamptz | |

No totals are stored here. Tokens and cost for a run are the sum of its calls, and
a stored total is a second place for the same fact to live and a first place for it
to be wrong. Adding up is plain code and costs nothing.

### `calls`

One row for one model call, which is the row `CLAUDE.md` requires. A call that
failed still has a row — the failure is a row with a status, never an absence.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `deliberation_id` | uuid | → `deliberations` |
| `seq` | int | 1 to 8, the order the calls were made |
| `role` | text | `advocate` or `judge` |
| `agent` | text | `jon`, `tyrion`, `daenerys`, `grey_worm`, `barak`, `elon`, `shamgar` |
| `seat` | text | `defence` or `prosecution`; null for a judge |
| `is_retry` | boolean | true on the one call that spent the spare |
| `status` | text | `complete`, `malformed`, `failed` |
| `model_requested` | text | what was asked for |
| `model_answered` | text | what the response names; null if nothing came back |
| `position` | text | advocates only, null otherwise |
| `verdict` | text | judges only, null otherwise |
| `reasons` | text[] | |
| `controlling_ground` | text | judges only |
| `tokens_in` / `tokens_out` | int | counted apart, never summed into one column |
| `price_in_per_m` / `price_out_per_m` | numeric | the prices in force when the call was made |
| `cost_usd` | numeric | |
| `latency_ms` | int | |
| `raw_response` | text | kept whatever the status |
| `error` | text | null unless the call failed |

`position` and `verdict` are separate columns and each is null for the other role.
There is no column that holds both, so the query that counts seven outcomes on one
case cannot be written by accident.

Four constraints do work here that code should not be trusted to remember:

- an advocate row has no `verdict` and no `controlling_ground`
- a judge row has no `position`
- a row that is not `complete` has neither a `position` nor a `verdict` — **a
  failed call cannot carry an outcome, and the worst thing this system could do is
  therefore impossible rather than merely forbidden**
- a `complete` row has at least two `reasons`

`price_in_per_m` and `price_out_per_m` are written on every call rather than looked
up later. Model prices move. Without them a run from last month leaves tokens and
dollars with no way to get from one to the other, and the per-model economics
Mikael asked for stops being reproducible the moment a provider changes a price.

`raw_response` is kept even when the answer parsed cleanly. When a model returns
prose instead of the fixed shape in step 7, the text it actually returned is the
only evidence of why, and by then the call is gone.

## The order of the work

Each of these is a commit or a short run of them, and each leaves the project
working. Nothing here adds a dependency; if one turns out to be needed, it is asked
for before it is installed.

1. **The skeleton.** TypeScript, the Netlify function entry point, the build
   command and publish directory that the first deployment was deliberately left
   without. The red deploy turns green here and nowhere earlier.

2. **The schema.** The three tables above, once approved, as a migration held in the
   repository. Row-level security on, no policies.

3. **The charge sheet rules.** One module holding the rules from
   `docs/charge-sheet-spec.md`, imported by the browser for courtesy and by the
   server for the decision. One source, two callers.

4. **Submission and storage.** A sheet arrives, is checked on the server, and is
   either stored or refused with every failing field named. No model call exists in
   the codebase yet, so at this point it is impossible to spend anything.

5. **One call, logged.** The OpenRouter client: send, receive, write the row. The
   row records the model named in the response. This step is finished when a single
   call produces a complete row with tokens counted apart, prices captured and cost
   worked out.

6. **The advocate wave.** Four calls together, four rows, four positions.

7. **The judge wave.** Three calls together, after the advocates. The four
   submissions are assembled by seat and not by name, each carrying the position its
   author reached.

8. **Failure and the spare.** The retry, claimed once per deliberation. A judge that
   fails leaves its seat showing a failure and the other opinions standing; an
   advocate that fails stops the run before the judge wave. This is built as its own
   step rather than folded into the two above, because it is the behaviour most
   easily left half-done and hardest to notice missing.

9. **The screen.** Three opinions side by side, never merged. Each carries its
   verdict, its reasons and its `controlling_ground`. A seat that failed shows the
   failure in place. The four submissions are shown with full attribution — name and
   seat — because attribution was only ever withheld from a judge's prompt.

10. **The economics.** The per-call table Mikael asked for: model, price in, price
    out, tokens in, tokens out, cost, time. Then the run's totals underneath it,
    added up in plain code from the rows.

The waves are built before the failure handling, and the screen before the
economics, because each of those pairs is testable on its own and a broken second
half never hides a broken first half.

## The checks this build is measured against

Two groups. The first spends nothing and runs whenever anything changes. The second
costs money and is run by hand.

### Checks that spend nothing

These use recorded responses, never a live model.

**The charge sheet**

- a sheet without a question is refused, and no call is made
- fewer than three agreed facts, two identical facts, background under 150 or over
  400 words, an act alleged under ten words — each refused on its own
- a refusal names every field that failed, not the first
- the same rules produce the same answer in the browser and on the server

**The shape of an answer**

- an answer with one reason is malformed, not complete
- an answer missing `controlling_ground` from a judge is malformed
- a verdict outside the two fixed values is malformed
- prose that contains the word justified is malformed, and no verdict is taken from
  it

**The record**

- a malformed or failed call still writes a row
- a row that is not complete carries neither a position nor a verdict — attempted
  directly against the database, so that the constraint is what is being tested and
  not the code in front of it
- an advocate row carries no verdict; a judge row carries no position
- `tokens_in` and `tokens_out` are present and separate
- the row names the model that answered

**The rules of the panel**

- a deliberation makes at most eight calls
- the spare is claimed by the first failure and is not available to the second
- an advocate failure stops the run before the judge wave
- a judge failure leaves the other two opinions standing and shows the third as a
  failure
- a run's totals equal the sum of its rows
- nothing in the output merges, ranks or averages the three verdicts

### The check that spends

One smoke run of case T-001 against the real seven models. Roughly four cents.

- seven calls, seven rows, seven models named in the responses
- three opinions come back in the fixed shape
- the run's cost lands under `MAX_USD_PER_DELIBERATION`
- the whole deliberation finishes inside the function timeout

**It is never automatic.** Not on a commit, not in a deployment, not on a file save.
A loop can spend faster than anyone is watching, and this is the only thing in the
project that spends at all.

## What finished looks like

Every check above passes and is written down as passed or failed. A charge sheet can
be submitted, refused when it should be, and run when it is sound. Three opinions
appear side by side and are not combined. A failure appears as a failure. The
economics table shows what each of the seven models cost, input and output apart.
