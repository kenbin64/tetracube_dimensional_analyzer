# The Dimensional Core

**Internal reference.** This document states the method. It is for this repository only, and does
not go into client work, Handshake or Dynamo material. What may be shown outside is the concept and
the measured results, not the method.

Every claim below is carried by a receipt in `test/`. Run them yourself:

```
node run-tests.mjs
```

---

## 1. The model

The engine implements one model, stated in Ken's terms, and the code is written to follow it rather
than to translate it into something more familiar.

### 1.1 A dimension is a type, and its name is a point

A dimension is not an instance. A car is the car dimension. Toyota is a brand, Corolla a model.
The **name is a point that symbolically holds everything that type could ever be**, and none of that
is spent until something asks for it.

Toyota could have anything to do with any of their cars, products, company, stock or holdings. We do
not care until we do.

### 1.2 Collapse is encapsulation, not compression

This is the part most easily misread, and misreading it produces the wrong engine.

A car is a dimension with all of its parts. We call it a car and count that as **a single point**.
Nothing was encoded. Nothing needs decoding. Nothing was lost, because **the interior is never
operated on**. Collapse is a statement about what we are counting, not a transformation of what is
counted.

Compression is a separate product feature that happens to live in the same engine. Do not conflate
the two.

### 1.3 A whole below is exactly ONE above

1 bridges the dimensional divide without hitting zero.

This is exact, not decorative. A unit basis vector has length 1 measured along its own axis, so it
is **parallel** to itself, and it is orthogonal to every other axis, so it is **perpendicular** to
them. One object, both roles, and what makes that work is that its magnitude is 1. `[Established]`

Zero is the failure mode. The zero vector is the only vector with no direction, so landing on zero
does not collapse a thing to a point, it **erases** it. `[Established]` That is the difference
between this and an aggregation that sums a car's parts into a number and throws the car away.

The operational rule that falls out: **counting is level relative.** A fleet of ten cars is ten, not
ten times the parts per car. The level you stand on fixes what "one" means.

### 1.4 Each dimension is a single point in the next, for every perpendicular axis

This holds universally, not for one privileged direction. Whichever axis you look down, everything
perpendicular to it collapses to a point.

So there is **no canonical level 0, 1, 2, 3 to walk**. Pick a viewing direction and you get a ladder;
pick a different one and you get a different ladder over the same structure. That is why it is not a
tree, why there is no top, why you can go down, up and up, over and over, and make your own
connections. Those are consequences of one operation, not navigation features bolted on.

### 1.5 We do not traverse

If we want the spark plug, we invoke the spark plug. We relate it to a car type or a particular car
only if we need that, and we never inventory the whole car to do it.

**Unless inventorying the car is the actual purpose.** Then we do, and paying for it is correct.

The measurable consequence, and the one that makes an unbounded structure workable:

> **The cost of an answer is proportional to what was asked, not to the size of the structure.**

### 1.6 The ladder keeps going

Wanting the spark plug is not wanting its function, its specs and its operation. Those are one more
invocation, made when needed. A part is itself a dimension with parts, all the way down.

### 1.7 No one thing holds all the answers

Things are made of parts and each part has its own attributes. Most real questions live **between**
dimensions rather than inside one, which is why a relationship has to be **made** rather than looked
up. There are no prior relationships. A relationship is created on demand, from the coordinates
actually present, and if there is no ground for it in the data it does not resolve.

### 1.8 A dimension may hold a manifold instead of every aspect

Parts can be saved as a manifold rather than every aspect of them. When grainy detail on a spark plug
is needed, consult the spark plug's manifold and it gives the answer.

At one time the system needs **all** the info of the spark plug, from wherever it can get it. That
gather is expensive and correct, because at that moment it is the purpose. Once it is had, a manifold
is induced from it, and from then on the individual aspects are encoded by the manifold, **for as
long as that manifold is maintained**.

### 1.9 Holding data is the last resort

A great deal can be derived from the manifold, so **no prior input is even needed**. That inverts the
usual default: the manifold is primary and stored data is the **residual**, kept only when it cannot
be derived.

---

## 2. The API

`src/invoke.mjs`

### Space and ingestion

| Call | What it does |
|---|---|
| `createSpace()` | An empty space. It can answer questions with nothing ingested, if it has manifolds. |
| `ingest(space, records)` | Reads what it is handed, once, indexing every point by name. |
| `resetMeter(space)` | Zeroes `space.touches`, the cost meter. |

`touches` is not decoration. Every read of a point goes through it, so cost claims are measured
rather than asserted.

### Invocation and levels

| Call | What it does |
|---|---|
| `invoke(space, name)` | Resolve a dimension by name. No traversal. Returns `null` if it is not there. |
| `collapse(point)` | States that this whole is one point above: `{ count: 1 }`. Does not touch the interior. |
| `expand(space, point, depth)` | Interior to the requested depth. `Infinity` is the full inventory. |
| `countAt(space, name)` | How many of that dimension exist, counted at its own level. |

### Relationship

| Call | What it does |
|---|---|
| `relate(space, a, b)` | Derives a containment relationship at the moment of asking. Returns `grounded: false` with a reason when the data does not support one. |
| `ask(space, {need, combine})` | Composes an answer across several dimensions. Every leg must be grounded or the whole answer refuses and names the failing leg. |

### Manifolds

| Call | What it does |
|---|---|
| `setManifold(space, name, {derive, samples})` | Attach a manifold to a dimension (the type, not an instance). |
| `verifyManifold(space, name)` | The fence. It must reproduce the samples we hold, or it does not answer. Cached. |
| `consult(space, name, at)` | Derive grain. One touch, whatever the size of the field described. |
| `acquire(space, name, {by, of})` | The full gather: every aspect of every point of this type. |
| `induce(space, name, {by, of, candidates})` | Find a generator reproducing **every** acquired aspect. |
| `maintain(space, name, observations)` | Hold it against new grain. Agreement widens; contradiction invalidates. |
| `shedEnumeration(space, name, aspects)` | Drop stored aspects the manifold now encodes. |
| `derivable(space, name, at, value)` | Can this fact be derived? |
| `hold(space, name, at, value)` | Keep it **only** if it cannot be derived. The last resort. |
| `heldCount(space)` | How much residual is actually stored. |

---

## 3. The fences

These are what keep derivation from becoming invention. Each is enforced in code, not advised in a
comment.

**A manifold must reproduce what we already know.** If it cannot, it does not get to answer anything.

**Agreement is judged only on aspects actually observed.** A manifold is *allowed* to reach further
than the grain we hold, which is exactly what makes potential answerable: nobody ever recorded the
spark potential, the manifold yields it. What it may not do is disagree about something we did
observe. An earlier version of this fence compared the derived object whole, which banned the very
thing the fence exists to protect. The receipts caught it.

**Past its edge, it stops.** A question outside a manifold's reach returns `grounded: false`, not a
guess.

**Induction must reproduce every acquired aspect, not most.** A candidate right about the grain we
happen to check and wrong elsewhere is worse than no manifold at all.

**"As long as it is maintained" is a condition, not a caveat.** Contradicting grain invalidates a
manifold, and an invalidated manifold **stops answering** rather than quietly being wrong.

**Observed outranks derived.** A held residual exists precisely because the manifold could not
produce it, so it answers first, and is marked `derived: false`.

**One ungrounded leg sinks a composed answer.** A partial is never dressed up as whole.

---

## 4. What the receipts actually prove

| Claim | Receipt |
|---|---|
| Cost is blind to the structure | The same one-point answer costs **1 touch in a 12-point space and 1 touch in a 602-point space** |
| Cost tracks the ask | Asking for every engine costs exactly the number of engines |
| Invoking does not descend | Invoking the spark plug costs the plugs alone, not their specs or operation |
| Collapse loses nothing | A car collapses to 1 while the interior is asserted still present |
| Counting is level relative | The same space is 3 cars and 12 wheels |
| Inventory still works | `depth: Infinity` reaches the spark plug through car, engine and cylinder |
| Potential is derived, not recalled | `sparkPotential` appears in no sample, is asserted absent, and consult yields it |
| Aspects survive shedding | 4 stored gaps dropped, consult still returns 0.044 exactly |
| Maintenance is real | Contradicting grain invalidates; the manifold then refuses to answer |
| No prior input needed | A space with **zero points ingested** answers from the manifold alone |
| Data is the residual | Offered 99 derivable facts it keeps **0**; keeps only the 2 it cannot derive |
| Composition refuses honestly | A missing leg names itself in the refusal |

---

---

## 5. What this buys an analysis

The car and the spark plug are the worked example because they are concrete. Nothing in the engine
knows about cars. The same five properties are what an analysis actually gets.

### 5.1 You can start anywhere

There is no root to enter through and no index to build first. Any dimension is reachable by name, so
an analysis begins at whatever the person actually cares about. Ask about one field in one file
without opening the rest.

### 5.2 The structure may be larger than anything you could enumerate

Because nothing is traversed unless traversal is the purpose, an unbounded or merely enormous
structure is workable. The limit is the size of the question, not the size of the corpus. A
one-point answer costs the same in a small space and a large one, and that is measured, not claimed.

### 5.3 Relationships are found, not declared in advance

No schema has to anticipate which things relate to which. There are no foreign keys to define, no
joins to plan, no ontology to agree on before the first question. The relationship is computed when
someone asks, from the coordinates present, and it reports honestly when there is no ground for it.
That is what lets the same engine serve someone organizing photographs and someone auditing a
research corpus, without either of them modelling their world first.

### 5.4 The higher level is where meaning appears

Once a whole counts as one, relationships **between** wholes come into view that are invisible from
inside. From inside the engine you cannot see the fleet. From inside the transaction you cannot see
the customer. Each turn of the ladder is a larger perspective on the same object, and structure,
meaning, purpose and potential each become available only from a level above the one that produced
them.

### 5.5 Most of what you would have stored, you do not need

Where a relation holds, the manifold answers and the data is never kept. What is kept is the
residual: the exceptions, the genuinely arbitrary, the things no rule produces. In the worked case
the engine was offered 99 facts it could derive and kept none of them, then kept the two it could
not. Storage becomes the record of what is *irregular*, which is also the most interesting part of
most datasets.

### 5.6 The honest failure mode

Every operation here can refuse. A manifold that cannot reproduce what is already known does not get
to answer. A question past a manifold's edge stops. A composed answer with one ungrounded leg
refuses and names the leg. A manifold contradicted by new observation invalidates itself and stops
answering.

This matters more than any capability above it. An analysis engine that always produces an answer is
indistinguishable from one that guesses. The value is in knowing which answers are carried by
evidence and which are not, and the engine is built so that the second kind never reaches the user
wearing the clothes of the first.
