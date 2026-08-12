# Tribunal as a Web Application

Module 7 · ASE-26 · Tomer Ben Bassat · 12 August 2026

I think of Tribunal as an ordinary web application with one unusual part. Its browser, backend and database do what those parts always do. What is unusual is a single call that is slow, costly, and non-deterministic. Most of the architecture I suggest exists to keep that one call under control.

The browser is where the user writes the charge sheet — the defendant, the act, the exact question — and reads the opinions that come back. It can check that the sheet is complete, but only as a courtesy. Its code runs openly on the user's machine, so the check that decides has to happen again on the server. Without it, someone could post an empty sheet and spend seven paid calls on nothing.

The backend is where the authority sits. It holds the OpenRouter key, the rubric and the seven prompts, and it runs the panel. The database is the memory: charge sheets, arguments, verdicts, and one line for every model call. Deployment makes it reachable, and makes one mistake everyone's.

One click runs the whole request cycle. The browser posts the sheet, the backend validates it, stores it, and opens the panel. The four advocates do not depend on one another, so they run together. The three judges wait for those arguments, but not for each other. That is two waves rather than seven turns: about six seconds instead of twenty-one. I would keep it synchronous while it fits the platform's function timeout, and move it behind a job if it stops fitting. Each call is written down as it returns. If one fails, the user sees a failure, never a verdict.

For the stack I would use what the course assumes: Supabase for the database, Netlify for deployment. That settles the database question the way I would settle it anyway. A case is plainly relational, but the stronger reason is the log — its columns are fixed, its value is in adding numbers up across cases, and a transaction can keep a case and its calls whole.

The audit trail belongs in the database rather than a file. On a hosting platform the filesystem is temporary, so one deployment can take the record with it. And a file written by two requests at once, or cut off halfway, leaves a partial line, which is worse than a missing one because it still reads as true.
