# Prompt log

Step 7 · ASE-26 running project · Tomer Ben Bassat

The only loop in this project. It turns on the prompts and not on the
specification, because the specification is Mikael's.

    run a case  →  read the three opinions  →  correct a prompt  →  run again

This file records **why** each edit was made, not what changed. What changed is in
the diff of `prompts/`, and the history of that directory is the evidence that I
read output and judged it rather than accepting it.

Every run notes which models were running when it happened. With seven different
models, an observation about a character is otherwise unattributable: a weak
argument from Jon Snow may be the prompt or may be `gpt-5-nano`, and a note that
does not say which cannot be read back later.

**One variable at a time.** A round either corrects a prompt or changes a model. It
never does both, or the next reading explains nothing.

## What I am reading for

- **Do the three judges reach the same verdict every time?** Repeated unanimity is
  the panel collapsing, whatever the verdicts say.
- **Do their controlling grounds come from three methods, or three restatements of
  one?** Agreement for the same reason is worse than agreement.
- **Does an advocate ever reach the position its seat argues against?** The package
  says the seat fixes the role and never the position, and a panel where that never
  happens is not obeying it.
- **Do the four representatives sound like four people?**
- **Does anything come back in the wrong shape?**

## Stop when

The three judges sound genuinely unlike one another, across runs and not once.

---

## Round 1 — three runs, nothing changed

30 August. Models: `gpt-5-nano` · `gemini-2.5-flash-lite` ·
`mistral-small-3.2-24b` · `llama-3.3-70b` for the representatives;
`claude-sonnet-5` · `gpt-5.1` · `gemini-2.5-pro` for Barak, Elon and Shamgar.

Three runs of T-001 with no edit to anything, because one reading cannot tell a
working panel from a lucky one.

| Run | Representatives | Judges | Cost |
|---|---|---|---|
| earlier, 29 Aug | justified, **not justified**, not justified, **justified** | not justified · **justified** · not justified | $0.0344 |
| 1 | **not justified**, justified, not justified, not justified | not justified · **justified** · not justified | $0.0337 |
| 2 | **not justified**, **not justified**, not justified, not justified | not justified · not justified · not justified | $0.0292 |
| 3 | **not justified**, **not justified**, —, not justified | never convened | $0.0009 |

Bold marks a representative that reached the position its seat argues against.

### What the judges did

Two runs split two to one and one was unanimous. In the two that split, the three
controlling grounds came from three methods and not three phrasings of one: Barak
on imminence and least harmful means, Elon on the halakhic doctrine of the rodef,
Shamgar on a private actor lacking the authority to execute anyone. **The judges
are working.**

In run 2 all three said not justified. Elon still named the rodef but framed it as
"strict necessity and imminence", which is Barak's vocabulary rather than his own.
One instance, worth watching rather than acting on.

### What the representatives did, and this is the fault

Across four runs, the two defence representatives reached *not justified* six times
out of eight. In runs 2 and 3 **nobody argued that the killing was justified at
all** — every representative that answered came back against it.

The judges in run 2 were then unanimous, which is exactly what `CLAUDE.md` says to
treat as a signal to look at the prompts. The prompt to look at is not a judge's.
A panel where no one makes the defence case has not given its judges a case to
weigh, and their agreement means nothing.

The wording is mine and it is the wrong wording. The shared advocate block says to
"reach the position that record actually supports" and that the seat "is not your
conclusion". The package says only that the seat does not *fix* an opinion — it
does not ask a representative to stop representing. What I wrote turns four
advocates into four neutral assessors of a record that leans one way, and then they
all lean that way together.

Read against the record, this is not the models failing. The agreed facts are
heavily against Jon: unarmed, not attacking, intimacy used to get close, no
alternative attempted. A neutral reader lands on *not justified* nearly every time,
which is precisely why the seats exist.

### What run 3 also proved

Daenerys came back `429` from her provider. The spare was spent on her, the second
attempt failed too, and the run stopped before the judge wave and named her. Cost
$0.0009 rather than $0.034, because the expensive half was never called.

**The retry and the advocate-failure rule ran for the first time in the world
rather than in a test**, and behaved as written.

---

## Round 2 — the advocate block corrected

One edit and nothing else: the shared advocate block now says a representative is
there to represent, must look for the argument its seat can honestly make, and may
concede only after looking. Same seven models, same case.

| Run | Representatives | Judges |
|---|---|---|
| 4 | **not justified**, justified, —, not justified | never convened |
| 5 | **not justified**, justified, —, not justified | never convened |
| 6 | **not justified**, justified, not justified, not justified | not justified · **justified** · not justified |

**The edit did what it was meant to do.** Before it, across runs 2 and 3, not one
representative argued the killing was justified. After it, Tyrion argued it in
three runs out of three, and the defence case is on the record for the judges to
weigh. Jon still crosses, which is his to do — his profile has him accepting blame
quickly and undervaluing his own judgment — and the rule was always that a seat may
be crossed, not that it must be held.

Run 6 reached the judges and split two to one on three separate grounds again.

### The instrument broke, not the panel

Three of the six runs in this step died on the same thing:

    mistralai/mistral-small-3.2-24b-instruct is temporarily rate-limited upstream

Daenerys's model, refused by its provider. Nothing to do with a prompt.

**And the spare is useless against it.** The retry goes out about four seconds
after the failure and meets the same limit; the log shows both attempts inside
seven seconds of each other. A retry that does not wait cannot survive the one
failure it is most likely to meet.

This is the trap written into `CLAUDE.md` before it happened — seven agents are
seven providers that can be rate-limited — arriving on schedule.

The cost of it was small, which is the failure rule working: a run that dies in the
advocate wave costs about a tenth of a cent because the judges are never called.
