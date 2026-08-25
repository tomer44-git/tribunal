# The seven prompts

Step 3 · ASE-26 running project

Seven agents, one prompt file each, so that a change to one agent shows up as its
own diff and can be reviewed on its own. This file is documentation and not one of
the seven.

Mikael's package fixes what these prompts must carry. The four representatives and
their character profiles, the three judicial profiles, and the simulation rule —
the assigned seat fixes only the procedural role and never the opinion, the
inference, or the final position. The two verdict values are justified and not
justified.

Step 0 fixed what the prompts must produce. An advocate returns a `position` as
well as an argument. A judge returns a verdict, at least two reasons, and a
`controlling_ground` naming what in its own method decided the case. A judge is
shown the four arguments by seat and not by name.

What was open was the form all of that takes on the wire. It is settled below.

---

## The files

| File | Sent to |
|---|---|
| `_shared-advocate.md` | all four advocate calls, word for word |
| `advocate-jon-snow.md` | one call |
| `advocate-tyrion-lannister.md` | one call |
| `advocate-daenerys-targaryen.md` | one call |
| `advocate-grey-worm.md` | one call |
| `_shared-judge.md` | all three judge calls, word for word |
| `judge-barak.md` | one call |
| `judge-elon.md` | one call |
| `judge-shamgar.md` | one call |

Seven agents, seven prompts. The two shared files are not prompts; they are the
part of a prompt that every agent in a wave receives identically, and they exist
once so that they cannot drift into seven near-copies.

## How a prompt is assembled

An advocate call is the shared advocate block, then the charge sheet, then that
advocate's own file. A judge call is the shared judge block, then the charge sheet,
then the four submissions, then that judge's own file.

Everything identical inside a wave sits at the front and everything particular sits
at the back. That ordering was first chosen for prompt caching, and caching no
longer applies: each agent runs on its own model, so no model is sent the charge
sheet twice in a deliberation and there is no repeated prefix to save. The ordering
stays anyway, because a prompt whose shared part is one contiguous block at the top
is a prompt whose shared part can be diffed, and because critical rules belong at
the beginning or the end and never in the middle.

## What was decided, and why

**An agent answers in JSON.** A labelled text block would be more forgiving of a
model that adds a sentence of preamble, and that forgiveness is exactly the problem:
it blurs the line between an answer that arrived in the fixed shape and one that
nearly did, and that line is what my single retry depends on. Both chosen models
support a structured output mode, so the shape is enforced by the layer under the
prompt and not by asking politely in it.

**The shared block carries more than the charge sheet.** Everything identical inside
a wave sits in one block in front of it — the frame, the two verdict values, the
simulation rule, the output contract.

The original reason was caching, and that reason has since gone. One model per agent
means no model reads the same prefix twice in a deliberation, so there is nothing
for a cache to hold. What the block is still worth is the thing that made it a file
rather than a paragraph repeated seven times: four advocates that must be given
identical instructions are given them from one place, and an edit cannot reach three
of them and miss the fourth. That failure is silent, and it is the kind that shows
up in step 7 as a character behaving oddly rather than as an error.

**The profiles are copied from the package word for word.** The authoring notes are
dropped — `Length check: under 300 words` and `Research basis` are instructions
Mikael set for his own document, not instructions to an agent, and they would be
paid for on every call. Nothing else is touched. The moment I paraphrase a profile,
the behaviour I observe in step 7 traces back to my wording rather than to the
specification, and I lose the ability to say where it came from.

The line naming each judge's characteristic risk is kept. It is part of the profile
Mikael wrote, and cutting it would be editing the specification. I do not know
whether telling an agent its own weakness makes it avoid that weakness or perform
it, and that is worth watching in step 7 rather than deciding here.

**Answers have a ceiling in words, not only in tokens.** Each reason stays under 80
words and `controlling_ground` is one sentence. The judges' output is the larger
part of what a deliberation costs, so a ceiling belongs in the wording. A hard token
limit is a distant safety net only: reaching it truncates an answer mid-string and
turns a good opinion into a parse failure I caused myself.

Two reasons is the floor and the prompt says so, but the prompt is not what enforces
it. The shape is checked in code on the way in. The prompt asks; the check decides.

**An advocate is told its seat and nothing about the panel.** It does not learn that
three other representatives exist. The four run in parallel and cannot see each
other in any case, and an advocate that knows it has rivals starts arguing against
arguments it has imagined instead of building its own.

## One extension of the package, recorded as such

The package states the simulation rule under the representatives, where it belongs:
the seat fixes the procedural role and never the position. Judges have no seat in
that sense, so the rule as written does not reach them. The judge block carries the
parallel sentence instead — the profile fixes how you reason, not what you conclude.
That sentence is mine by analogy, not Mikael's, and it is written down here so that
nobody later mistakes it for part of the specification.
