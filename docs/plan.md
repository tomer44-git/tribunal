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

What is open is the shape of the record that carries all of it, and the order in
which it gets built.

---

## Open

1. Does one model call produce one row, or two — its telemetry apart from what it
   said?
2. Do advocate submissions and judge opinions live in one table or in two?
3. How is a charge sheet stored — columns with a list inside, or a child table for
   the agreed facts?
4. Is the price per million stored on every call, or only the cost it worked out to?
5. What are the checks this build is measured against, and does any of them spend
   money?

None of these is answered yet.
