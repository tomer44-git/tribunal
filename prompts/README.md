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

What is still open is the form all of that takes on the wire.

---

## Open

1. Does an agent answer in JSON, or in a labelled plain-text block?
2. What sits in the shared block that is cached, and what sits in the per-agent
   block?
3. How much of the package's profile text is copied verbatim — including the lines
   naming each figure's characteristic risk?
4. Is there a ceiling on the length of an answer, and how is "at least two reasons"
   stated to the agent?
5. How is the simulation rule worded, and does an advocate know who else is on the
   panel?

None of these is answered yet.
