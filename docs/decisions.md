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

## Still open

2. Does a judge's output carry a field naming what in its own method decided the
   case?
3. What is recorded in the log's verdict column for an advocate call?
4. What happens when parsing fails twice? The rule is to demand the fixed shape
   twice, and a third attempt would break the eight-call cap.
5. Does a judge see which advocate made which argument, or are the four presented
   unattributed?
