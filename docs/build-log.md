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

---

## Open

1. What may this project depend on at runtime?
2. Who applies the migration — me against the database, or you in the Supabase
   editor from a file I write?

Neither is answered yet.
