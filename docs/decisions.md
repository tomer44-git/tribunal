# Decisions

ASE-26 running project · Tomer Ben Bassat · August 2026

Mikael's information package is the specification and it is not mine to revise. It
fixes the four representatives and their character profiles, the three judicial
profiles, the canonical charge sheet for case T-001, the two verdict values —
justified and not justified — and the simulation rule that the assigned seat fixes
only the procedural role and never the opinion, the inference, or the final
position. It also fixes the scope: the Tribunal decides and gives reasons, and it
does not combine the three opinions into one.

What the package leaves to me is the structured output format and what follows
from it. Five questions were left open. Each was written down here before it was
answered, so that the order — question, argument, decision — is visible in the
record rather than asserted after the fact.

---

## 1. An advocate returns a position, not only an argument

**Decided.** Each advocate returns a stated position alongside its reasons. The
field is called `position`, not `verdict`, and it takes the same two values the
package fixes: justified or not justified. It is never counted, never displayed as
a tally, and never mixed with the judges' verdicts.

The package decided this for me before I did. Its simulation rule says the seat
does not fix "an opinion, factual inference, proposed argument, or final
position" — so the position is something the package treats as the advocate's own
and expressly not the seat's. If the output carries no position, that rule becomes
unobservable: an advocate in the defence seat that reasons its way to *not
justified* leaves no trace of having done so, and the most interesting thing this
panel can produce is visible only to someone reading prose carefully. I would
rather see it.

The second reason is consistency with what I have already written. Both
`CLAUDE.md` and `docs/02-cognified-economics.md` say an opinion is complete when
it carries a verdict, at least two reasons, and the fields that were asked for.
Without a position on the advocates, that sentence describes judges only and I
need a second, different completeness check for the other four calls. With it,
there is one rule for all seven.

The cost I am accepting is that a position field is shaped like a vote, and seven
vote-shaped fields on one case invite someone to add them up. That is what the
separate name and the rule against counting are for. The boundary stands: three
verdicts go out as three, and four positions are not verdicts at all.

**The judges see it.** The advocate's position is part of what the judges read,
not held back. Withholding it would mean handing a judge a different document from
the one the advocate produced, and that is an editing layer I do not want between
the two waves. The risk is anchoring — four advocates all saying justified may
pull the judges along — but that is a matter for the prompts, and step 7 is where
I will see it and correct it.

---

## 2. A judge names the ground that decided the case

**Decided.** Every judge's output carries one further field beside the verdict and
the reasons: a single sentence naming what, inside that judge's own method,
carried the decision. It is free text, it is required, and it is checked for
presence and length only — never for wording. The field is called
`controlling_ground`.

I considered a fixed vocabulary per judge and rejected it. The package gives three
profiles in prose, not three lists of tests, so an enumeration would mean
inventing a rubric the specification does not contain and then forcing three
simulated judges into it. `CLAUDE.md` already says to check the shape of an answer
and never the wording. A closed list of grounds is a wording check wearing a shape
check's clothes, and it would leave me with three different schemas and three
times the surface for a parse failure.

What the field is worth is that it makes my own stop condition legible. Step 7 in
`docs/method.md` says to stop when the three judges sound genuinely unlike one
another, and today that is an impression formed by reading three long opinions.
Three judges reaching justified on three different grounds and three reaching it
on the same ground are not the same result, and without this field they look
identical in a table. The first is the panel working. The second is the panel
collapsing, and I have written that unanimity is a signal to look at the prompts.

One thing has to be recorded about what the field is not. It is not the model
explaining itself, and I do not read it as an account of how the text was
produced — a model asked why it wrote something will supply a reason whether or
not one operated. It is a line of the opinion, written by the character, doing
what the profiles say these judges do: Shamgar isolates the governing provision,
Barak divides a principle into tests and applies each in sequence. Read as the
character's ground it is worth its thirty tokens. Read as introspection it would
be worth nothing.

---

## 3. An advocate's position is logged apart from the verdicts

**Decided.** A judge's verdict and an advocate's position are recorded separately.
They are never written into one shared column, and no query that adds up a case's
outcomes can return seven. Every row also carries its own status — complete,
malformed, failed — so that an empty field is never ambiguous. The columns
themselves belong to the data model and are settled in step 4; what is settled
here is that the two are kept apart.

The question as I first put it assumed a single verdict column, and that
assumption was the trap. Every row already carries its role, so nothing is
strictly lost by sharing a column — but the obvious query, *count the justified
verdicts on this case*, then returns seven and returns it silently. My boundary
says three verdicts go out as three. A column that makes the forbidden aggregate
the easy one is working against me, and after decision 1 this is no longer
hypothetical: there are four positions to record, and they use the same two words
the verdicts use.

Leaving the column empty for advocates fails for a different and worse reason. The
emptiness would mean two unrelated things — *advocate, not applicable* and *judge,
the answer came back malformed* — and those two must never be confusable. A
missing verdict that reads as absence by design is exactly how a broken run enters
the record looking healthy. That is why the status sits on every row rather than
being inferred from what is or is not filled in.

---

## 4. A failure is shown as a failure, and the retry is one per deliberation

**Decided.** The spare call is one retry for the whole deliberation, not one per
agent. The first malformed or failed answer claims it; a second failure in the same
run has no retry left. `CLAUDE.md` has been corrected to say so.

When the shape does not arrive, the answer is never repaired and never replaced. A
verdict is not extracted from prose by keyword, and no default or blank verdict is
written. What happens then depends on which wave failed:

- **A judge fails.** That seat is recorded as failed and shown as a failure on the
  screen. The other two opinions stand and are displayed. Two reasoned opinions and
  one visible failure are an honest record; three opinions where one was
  manufactured are not.
- **An advocate fails.** The run stops before the judge wave. The run is recorded
  as failed and the advocate is named.

The arithmetic forced the first part. Asking for the fixed shape twice and capping
a deliberation at eight calls cannot both mean what they appear to mean: seven
panel calls and one spare give exactly one second ask for the whole run. Raising
the cap would break a boundary I set on purpose and invalidate the token figures I
have already published in `docs/02-cognified-economics.md`. The cheaper thing to
move was the wording, so the wording moved.

Extracting a verdict from prose is the option I would refuse even if I talked
myself into it later. It produces a verdict indistinguishable from a real one,
which is precisely the well-formed wrong answer my own module 9 essay says a shape
check can never catch. A default verdict is named in `CLAUDE.md` as the worst thing
this system can do. Both are ways of inventing a record, and this project exists to
keep one.

Failing the whole deliberation on any error is clean and I understand its appeal — a
tribunal that lost a judge did not deliberate. I am not taking it, because it
discards calls I have already paid for and hides which agent broke, and which agent
broke is exactly what step 7 needs to read.

Stopping before the judge wave when an advocate fails is the part I am least
certain of, and I am recording the doubt rather than hiding it. Three arguments
might still make a real deliberation. But the judges run on the capable model, so
that is the expensive half of the run spent on input that no longer matches the
specification and that I cannot compare against any other run in the prompt log.

None of this touches what the package fixes. The package says nothing about call
counts, retries, or what to do when an answer comes back broken; it fixes what a
complete deliberation is. So one thing follows from it and is binding: a run with
two opinions is an incomplete run, and it is never displayed as a finished result
for T-001.

---

## 5. A judge sees the seat, not the advocate

**Decided.** The judges' prompts present the four arguments by seat — defence or
prosecution — and not by name. The screen and the log carry full attribution, name
and seat both. This is a decision about what goes into a judge's prompt and
nothing else; nobody reading the output loses anything.

Full attribution is how a real court works, and the four characters are vivid
enough that hiding them costs something. What it would put into a judge's prompt is
one strange fact: the prosecution seat is held by the deceased. A judge told that
Daenerys Targaryen is making submissions has to reconcile that against a factual
record stating she was killed, and that reconciliation is off-task and
unpredictable. Grey Worm carries a weaker version of the same problem — weighing an
argument from a named participant in the burning of King's Landing is not a
judicial method.

The honest objection to my own reasoning is that the characters are already in the
room. The charge sheet names them, and whatever the models believe about this story
is engaged the moment the case is read. Hiding the advocates' names removes none of
that. It removes only the artefact of the dead woman speaking — but that artefact
is the one that produces behaviour I cannot predict, and the seat costs nothing to
use instead.

The character profiles are instructions for producing four different arguments.
They are not evidence for weighing them.

Dropping attribution altogether was the third option and I am not taking it. Side is
usually inferable from the content anyway, and a judge who cannot tell prosecution
from defence cannot write that the defence's necessity claim fails — which is the
kind of sentence the three judicial profiles exist to produce.

This decision and the first hold each other up. Because the judges see an advocate's
position, a defence-seat advocate that concluded not justified reaches them as
"defence seat — position: not justified": the crossing arrives as a procedural fact,
without importing the character.

---

All five are closed. They are carried into `CLAUDE.md` at step 1, which is where
`docs/method.md` puts that work.
