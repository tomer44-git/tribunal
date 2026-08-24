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

## Open

1. Does an advocate return a position at all, or only an argument?
2. Does a judge's output carry a field naming what in its own method decided the
   case?
3. What is recorded in the log's verdict column for an advocate call?
4. What happens when parsing fails twice? The rule is to demand the fixed shape
   twice, and a third attempt would break the eight-call cap.
5. Does a judge see which advocate made which argument, or are the four presented
   unattributed?

None of these is answered yet.
