# The charge sheet specification

ASE-26 running project · Tomer Ben Bassat · August 2026

A charge sheet is written as a specification and not as free text. This document
says what its fields are, what makes one complete, and what is refused before any
model call is made.

Mikael's package fixes the canonical instance. Case T-001 carries a case
reference, an accused, a deceased, the act alleged, background written for a
reader new to the story, an agreed factual record, and a question for judgment. It
also fixes the scope: the Tribunal decides justified or not justified and gives
reasons, it imposes no sentence, and it does not combine the three opinions. The
package states the background at 200 to 300 words.

What the package does not settle is which of those blocks a new sheet must carry,
how far a check written in plain code can go, and what happens at the edge where a
sheet is complete in form and useless in substance. Those are open and are
recorded here before they are answered.

---

## Open

1. Which blocks must a charge sheet carry, and is any of them optional?
2. Is the agreed factual record a list of separate items, or one block of text?
3. Do the package's word counts become rules for every sheet, or do they stay a
   description of T-001?
4. How far does validation go against vagueness, which errors nothing and ruins
   everything?
5. Must the question be answerable by exactly the two verdict values, and can that
   be checked in code?

None of these is answered yet.
