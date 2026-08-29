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

## What makes one complete

| Field | Rule |
|---|---|
| `accused` | present, and named in `act_alleged` |
| `act_alleged` | at least ten words |
| `background` | between 150 and 400 words |
| `agreed_facts` | at least three items, each at least eight words, no two identical |
| `question` | present, and a single question |

The floors are there because a sheet that is too short is the failure I can
actually prevent. An advocate handed three lines still has to build an argument,
so it builds one out of invented facts, and the judges weigh it as though it
rested on something.

The ceiling is there because the charge sheet is read by all seven agents. Every
word in it is paid for on every one of the seven calls, so length in this one field
costs seven times what length costs anywhere else. It was once going to cost less
than that, because the repeated part would be cached; with one model per agent
nothing repeats for any single model and there is no cache to soften it. The
ceiling matters more now, not less.

The package states T-001's background at 200 to 300 words, and I have not adopted
that as a rule. The same kind of line — `Length check: under 300 words` — sits at
the foot of each judge profile in the package, which shows what those notes are:
constraints the author of the dossier set for the dossier, not validation the
application is asked to perform. My range is wider on both sides and T-001 passes
inside it comfortably.

## What is rejected before any model call

A charge sheet that fails any rule above is refused, and refused before the first
call is made. Nothing is attempted on a partial sheet and no wave is started to
see how far it gets.

A sheet that arrives without its question is the case that matters most. It is the
one failure that can look harmless — the accused is there, the facts are there,
the sheet reads like a document — and it is the one that guarantees seven calls
spent on nothing, because there is no question for anyone to answer. It is
rejected outright.

The refusal names every field that failed, not the first one. A user who fixes one
fault at a time, submitting again between each, learns the rules one rejection per
attempt, and there is no reason to make anyone pay that.

## Where the check runs

The browser may run these rules so that a user is told about a missing question
immediately rather than after a wait. That check is a courtesy and nothing more.
It runs on the user's own machine, where its code is open and can be skipped, so
anyone able to post a request can post past it.

The check that decides runs on the server, on every submission, with no exception
for a request that claims to have been checked already. Without it an empty sheet
can be posted directly and spend seven paid calls.

The rules exist once and both places read them. Two copies of the same rules drift,
and the day they drift the browser accepts what the server refuses, or worse, the
browser refuses what the server would have accepted and nobody finds out why.

## What this check cannot catch

Everything above is a floor. None of it is a test of whether a charge sheet is any
good, and it is worth being exact about the gap rather than letting the rules imply
a protection they do not provide.

A sheet can satisfy every rule on this page and still be vague. It can carry four
hundred words of background that establish nothing, three agreed facts that no
argument turns on, and a question broad enough that four advocates read four
different problems out of it. Nothing errors. Seven calls run, three opinions come
back, and they disagree about different things while appearing to disagree about
one. **That failure is invisible to code and it is mine to read.**

The same limit applies to the question in particular. Whether a question is
actually answerable by justified or not justified is a matter of meaning, and no
rule written against a string decides it. A question those two values do not fit
will still be answered by three judges, in the fixed shape, with reasons — and the
answer will be to a different question than the one asked.

I considered handing this to a model and did not. The model here builds arguments
and reaches verdicts, and nothing else; validation is plain code. A model asked to
grade a charge sheet is a call that spends against the cap in order to produce a
judgement I would have to check anyway.

## Known pitfalls

A sheet arrives without its question. Rejected before any call — the one rule with
no exception.

A sheet is too short. Caught by the floors, which is the whole reason they are
there.

A sheet is complete and vague. Not caught. Read the three opinions: when they are
answering different problems rather than disagreeing about one, the sheet was the
fault and not the panel.

A sheet is padded. The ceiling catches the extreme case. Everything under it is
paid for seven times, so the cost of a loose sheet is real even when it is legal.

The browser check is treated as the check. It never is. The server check runs on
every submission regardless of what the client says it did.
