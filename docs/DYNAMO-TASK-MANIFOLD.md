# The Dynamo Task Manifold

**Private. Local only.** This is method, and it stays in this repository. It never goes into a
Dynamo task repo, a PR body, an instruction file, or any client or Handshake material. What may be
shown outside is that tasks are screened before they are built, and the measured results, never how.

Companion to [DIMENSIONAL-CORE.md](DIMENSIONAL-CORE.md), which states the analysis method in
general. This document is that method applied to one question: **will this task thwart the agent?**

Code: `src/taskmanifold.mjs`. Receipts: `test/test_taskmanifold.mjs`.

---

## 1. Why a manifold rather than a judgement

Building a task and finding out costs about seventy minutes of pipeline per attempt, and a blocked
task costs a slot. Guessing is expensive.

The alternative is not to ask a model for an opinion. A model's opinion is the same class of thing
we are trying to predict. Instead, break the task onto its axes and derive the verdict:

> **It is software, so it is deterministic.** The same design in gives the same verdict out, every
> time, with the reason attached. Fifty runs of one design produce exactly one verdict, and the
> receipt asserts it.

No model is consulted anywhere in the decision.

---

## 2. The axes

A task is decomposed onto four perpendicular questions.

### `oracleGuidesSearch`

Not "can the agent check a guess" but **does checking narrow the search**.

This distinction is the one that cost the most to learn. Intact stripes fully determine a system, so
each check walks the agent toward the answer. Labelled points with an unknown degree *and* an unknown
modulus are equally checkable and guide nothing, because a failed candidate says nothing about where
to look next.

When checking guides, the agent searches until it wins, and **nothing buried inside the frame changes
that.**

### `frameGiven`

Does the domain vocabulary name the correct method?

"Parity record" tells any storage engineer to solve a linear system. The domain hands over the frame
for free, and everything after the frame is mechanical. A dataset of labelled examples, by contrast,
tells the agent to fit a model, which is the wrong frame entirely.

### `reflexConfidentlyWrong`

Does the reflex the task invites return a plausible **wrong** answer, rather than failing loudly?

A reflex that errors out sends the agent looking for a better method. A reflex that produces
confident wrong output lets it finish, satisfied, and be graded zero. The second is what stumps.

### `smoothCrux`

Is the crux recoverable by fitting? Anything smooth or parametric is a regression and the agent wins.
This one is absolute: a smooth crux is too easy regardless of everything else.

---

## 3. The rule

```
smooth crux                                  -> TOO EASY, always
checking narrows the search                  -> TOO EASY
otherwise, frame not given OR reflex wrong   -> STUMPS
otherwise                                    -> no verdict (never measured)
```

A **guiding** oracle is decisive. That is the finding, and it is the one that contradicts what looked
obvious.

---

## 4. The evidence

The manifold reproduces all eight measured outcomes or it is not allowed to speak.

| Task | Measured | Verdict |
|---|---|---|
| 8333840 recover-decision-rule | pass@5 0/5 | STUMPS |
| 3b8c2d6 keyed modular checksum | pass@2 0/2 | STUMPS |
| bbb74dc recover-screening-rule | PR accepted | STUMPS |
| 47f3bb3 v2 secret modulus | pass@5 3/5 | TOO EASY |
| 47f3bb3 v3 secret coefficients | pass@5 3/5 | TOO EASY |
| 3b8c2d6 v1 format-from-samples | pass@2 2/2 | TOO EASY |
| fb6f02d chart layout | pass@2 2/2 | TOO EASY |
| crypto key-recovery | solved 2/2 | TOO EASY |

`bbb74dc` is the **held-out point**. It was scored from its design and only then checked against the
`accepted` label it carries, which means it cleared the difficulty gate. It was not used to write the
rule.

### What the evidence overturned

47f3bb3 was hardened twice. Positional coefficients became a secret modulus, then a secret modulus
*and* secret coefficients, forcing an integer-relation route through Bareiss determinants and a
GF(P) null space. pass@2 moved from 1/2 to 0/2. **pass@5 stayed at exactly 3/5 both times.**

The flatness was the signal. Two very different difficulty levels, one number. The manifold's reading
is that the intact stripes are a guiding oracle and the algebra buried behind them was never the
operative variable.

This also corrected a recommendation already given. The proposal on the table was to break the
*frame* by varying coefficients per stripe. The manifold says the frame is not the operative axis in
this task; the guiding oracle is. Removing the oracle is what moves it.

---

## 5. Where it refuses

**Eleven of the sixteen corners have never been built.** `judge()` returns no verdict for those,
saying the combination has never been measured and should be built rather than guessed at.

One corner cannot be derived at all: **no guiding oracle, frame handed over, reflex fails loudly.**
Every other unbuilt corner falls under an existing branch of the rule; this one falls under none.
That makes it the single most informative task available, because it is the only one that can teach
the manifold something instead of confirming it.

---

## 6. How to use it before building

1. Score the intended design on the four axes.
2. Run `judge()`.
3. `TOO EASY` means do not build it. The reason names what to change.
4. `STUMPS` means build it, and treat the verdict as a prediction to be checked, not a guarantee.
5. `NO VERDICT` means this corner is unmeasured, which is a reason to build it if you can afford the
   slot, because the outcome is worth more than the task.
6. When the outcome lands, add it to `MEASURED`. Agreement widens the evidence. Contradiction
   invalidates the manifold, and an invalidated manifold stops answering until it is re-derived.

Screening is not a substitute for the other checks. `dynamo-lint.mjs` still catches method leaks,
framing, ambiguity, and the packaging defects that have cost real pipeline runs (a missing Dockerfile
`COPY` for an `/app` input, a build context with subdirectories and no `.dockerignore`). This manifold
answers only the difficulty question.

---

## 7. Honest limits

**Eight measured points is thin.** A rule that separates eight cases can be wrong about the ninth.
Its authority is exactly as strong as its evidence.

**The axis scoring is a reading, not a measurement.** The manifold is deterministic *given* the axes,
but the axes come from a human judging the design. That is the weakest link in the chain. Deriving
axis values from the task files deterministically, inside `dynamo-lint`, is the fix. Until that
exists, treat a scored design as `[Observation]`, not `[Established]`.

Applying the manifold to past tasks already caught one instance of exactly this. The first axis was
`selfVerifiable`, and under its literal reading 8333840 should have scored `true`, since it hands the
agent labelled points it can check against. That would have made the manifold contradict its own
strongest data point. The axis was sharpened to `oracleGuidesSearch` rather than the label bent to
fit, which is the only honest direction to resolve it.

**Model drift.** Every outcome here is Opus-4.8 with Terminus-2 on Daytona. A different benchmark
model invalidates the evidence base, not just individual rows.
