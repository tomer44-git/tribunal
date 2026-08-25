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
sheet is complete in form and useless in substance. Those are settled below.

---

## What it is for

The charge sheet is the one document every agent in a deliberation reads. Four
advocates build arguments from it and three judges weigh those arguments against
it, so its faults do not stay where they start. A sheet that is thin makes the
advocates invent facts, because they still have to build an argument, and the
judges then weigh reasoning that rests on nothing. A sheet that is vague produces
four arguments about four different problems, and the three opinions that follow
are not really disagreeing about the same thing. Neither of those failures raises
an error. They just waste seven paid calls and return something worthless.

That is why the sheet is written as fields rather than as free text. A rule
written against a field can be stated, tested and shown to a user before anything
is spent. A rule written against prose cannot.

## The fields

| Field | Required | Supplied by |
|---|---|---|
| `case_reference` | yes | the system |
| `accused` | yes | the user |
| `deceased` | no | the user |
| `act_alleged` | yes | the user |
| `background` | yes | the user |
| `agreed_facts` | yes | the user |
| `question` | yes | the user |

`deceased` is the one optional field, and it is optional on purpose. It is a field
of a killing. T-001 is a killing, but the Tribunal takes a charge sheet from a
user and the question it answers is whether an act was justified. Requiring a body
would make a whole class of case impossible to submit, and the package never asks
for that.

`agreed_facts` is a list of separate items, not one block of prose. The package
wrote T-001's factual record that way itself, in five marked items, and the shape
earns its place twice over: a list can carry a floor that can be counted, which a
block of text cannot, and an argument can answer one item rather than gesturing at
a paragraph.

The two verdict values are not a field. The package fixes them as justified and
not justified, so they are never supplied by a user and never varied by a case.
