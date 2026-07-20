# Using this from another agent

This is a **deterministic, non-AI** toolkit. No model in the loop, no network. The same input produces
the same output on every run. That property is the whole reason it exists here: the tasks it reads are
**built to stymie AI**, so you cannot judge them with an AI (it gets stymied too, or answers
differently each time). You need a fixed, reproducible structural read. This gives you one.

Requires Node 18+. Nothing to install.

## Analyze a task description

```js
import { analyzeTask, taskReport } from './src/index.mjs';

const a = analyzeTask(taskText);

// a.scores => { requirements, dependencies, clarity, completeness, verifiable, complexity }
// a.requirements  the independent things the task asks for (the axes)
// a.dependencies  ordered / referential couplings ("after ...", "then ...", "using the ...")
// a.constraints   must / should / only / limits
// a.inputs, a.outputs, a.acceptance
// a.ambiguities   [{ term, context }]  the points where the spec collapses into the undefinable
// a.residual      the original task text, kept whole (the analysis never rewrites the task)

console.log(taskReport(a));
```

## Reading the signals when judging a stymie-task

- **`verifiable: false`** — there is no checkable success condition, so a grader cannot score a solution
  objectively. This is often the difference between a hard-but-fair task and an unfair one.
- **`ambiguities`** — where the spec goes undefinable: "handle it appropriately", "make it robust",
  "the right format", "etc". Each is a place an honest solver cannot know when it is done.
- **`complexity`** — requirements plus ordered dependencies; more moving parts, more room to trip.
- **`clarity` / `completeness`** — 0..1 structural reads (ambiguity density; and whether inputs,
  outputs, constraints, and a success condition are all present).

It returns **signals, not verdicts.** It tells you the shape of the task; you decide what to do with it.
It never calls a model, never touches the network, and never changes the task text.

## The rest of the surface

The same import also exposes the lossless engine (`seed`, `bloom`, `seedBest`, `shaSeq`), the source
analyzer (`analyzeCss`), the file-type + adoption guard (`classify`, `adopt`), and the self-verifying
capsule (`pack`, `verify`). See `README.md` for those. The method behind the engine is kept private;
what is published is the concept and the runnable results.
