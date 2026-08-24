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
from it. Five questions are open. They are recorded here before they are answered,
so that the order — question, argument, decision — is visible in the record rather
than asserted after the fact.

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

## Still open

4. What happens when parsing fails twice? The rule is to demand the fixed shape
   twice, and a third attempt would break the eight-call cap.
5. Does a judge see which advocate made which argument, or are the four presented
   unattributed?
