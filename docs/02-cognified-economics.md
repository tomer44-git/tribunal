# Tribunal as Cognified Software

Module 9 · ASE-26 · Tomer Ben Bassat · 12 August 2026

What makes Tribunal cognified is not that it calls a model. It is that no set of written rules could produce its verdicts. Kevin Kelly called this cognifying in *The Inevitable* (2016) — whatever was electrified will now be cognified. And the model here runs every time someone uses the app, not once while I build it. It is a runtime component.

A cognified system is not model all the way through. Most of Tribunal is plain code: validating the sheet, storing it, finding an earlier case, adding up the log, drawing the screen. Only two things need a model — building an argument and reaching a verdict. Everywhere else, plain code is faster, cheaper and repeatable. The cheapest call is the one I never make.

Two of those properties shape how I build. The model is not deterministic: the same sheet can come back with different reasoning, and on a hard case with a different verdict. So I check the shape of an answer rather than the answer itself — a verdict, at least two reasons, the fields I asked for — and leave the content to a reader. That last part matters, because a wrong answer here does not arrive broken. It arrives fluent.

One deliberation is seven calls, not one: four advocates, then three judges. Each judge reads all four arguments, so a full case runs to roughly seventeen thousand tokens and most of them fall on the judges. Adding an agent therefore costs more than its share, because every judge added reads everything before it. The same shape sets the wait, since the judges cannot start until the advocates finish.

Two things reduce that bill. All seven agents read the same charge sheet, so caching the repeated part means paying for it once instead of seven times. But the larger lever is which model each agent uses. Building one side of an argument is not the same work as weighing four of them, so I would run the advocates on a cheaper model and keep a capable one for the judges. That is a design decision the cost made for me.

A loop can spend faster than anyone is watching, so I would cap the calls a single deliberation may make and what a single run may cost. One deliberation is cheap. Ten thousand of them are a different system, and the difference was decided long before the bill arrived.
