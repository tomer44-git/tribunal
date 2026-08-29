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
