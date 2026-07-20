# Dimensional Analyzer

**Store the generator, derive the field.** A small, lossless, self-testing engine that reads a
structure, decomposes it into its dimensions, and rebuilds it byte-for-byte. Every claim on this
page is backed by a test you can run in under a minute. No network, no framework, no magic.

```
137 green checks across 16 receipts, 0 failed
```

> **Using this from another agent?** It reads task descriptions **deterministically**, with no AI in the loop, which is exactly the point when the tasks are built to stymie AI. See [`AGENTS.md`](AGENTS.md).
>
> The flagship product front-end (TetraCubeDB, private preview) lives in [`web/`](web/).

---

## The problem

Software spends a huge share of its time moving the same information between shapes: objects to
database rows, nested records to flat tables, one collection to another. Each translation is a
chance to lose something (the object-relational impedance mismatch) or a reason to bolt on a heavy
ORM that papers over the gap and leaks anyway. And most structure gets stored *flat and then walked*
(parse a tree, traverse branch to branch) when the useful parts could be reached directly.

Two honest questions fall out of that:

1. Can you translate between these shapes and **prove nothing was lost**, without an ORM?
2. Can you reach the independent parts of a structure **by address** instead of walking to them?

## The idea

Treat any structure as **dimensional**.

- The **independent** parts are addressable coordinates. You reach them directly, the way you index
  an array, not the way you walk a tree. *(Addressing beats traversal is [Established] data-structure
  design: arrays, hashing, embeddings. The dimensional lens surfaces it; it does not invent it.)*
- The **coupled** parts are surfaces kept whole. A coupling is where fixing one factor changes
  another (a `z = x·y` surface, a join table, a trade-off). You keep it intact instead of flattening
  it to a scalar that would lose its factors.
- Anything the rule does not capture is carried in a **residual**, so the rebuild is exact.

That last point is the whole discipline: a structure is re-expressed as a **rule that predicts** plus
a **residual that carries every deviation**. Because the residual is always kept, the rebuild is
**100% lossless, always**, and you prove it with a SHA round-trip: `bloom(seed(x)) === x`.

Getting smaller is a *side effect* of how much real structure the rule exposed, never the pitch.
Structureless data stays lossless and simply gains nothing. That honesty is the feature.

## What it does today (all receipted)

| Capability | What it proves | Receipt |
|---|---|---|
| Flat record ↔ table row | A record is a point; a table is a surface. Round-trips SHA-clean. | `test_roundtrip_flat.mjs` (8) |
| Seed / bloom | Rule + residual. Lossless on structure **and** on noise. | `test_seedbloom_fib.mjs` (6) |
| Polynomial rules (finite differences) | Degree-2/3 runs (squares, cubes, any low-degree polynomial) collapse to their base terms; integer-exact, still lossless, still 1.0x on non-polynomial data. | `test_polynomial.mjs` (11) |
| Skin and recurse | A skinned unit is a point one level up; lossless at every rung. | `test_ladder.mjs` (6) |
| Honest benchmark | Wins on structure, **1.0x on random**, zero nowhere, lossless everywhere. | `benchmark.mjs` (4) |
| Benchmark on real bytes | Sorted/counter/run columns win big; text, true-random, and already-gzipped bytes read ~1.0x. | `benchmark_bytes.mjs` (5) |
| Durable rules (registry) | Versioned rules: detached seeds still bloom; versions are immutable. | `test_registry.mjs` (5) |
| Returnable time | Event sourcing: replay to any frame; run it backward and the glass recomposes. | `test_rewind.mjs` (8) |
| Code ↔ schema (no ORM) | One-to-one mapping. Address vs encapsulate chosen by one rule; both lossless. | `test_relational.mjs` (10) |
| Collections | One-to-many (order kept), dedup (shared entity stored once), many-to-many = join = coupling surface. | `test_collections.mjs` (8) |
| Inheritance / polymorphism | A subtype adds axes; single-table and table-per-class both round-trip identical records. | `test_inheritance.mjs` (10) |
| Propagation | Change an input, only the local neighborhood recomputes. Cycle-safe. | `test_propagate.mjs` (9) |
| Self-verifying capsule | Manifest carries sha256 + provenance; a tampered byte or residual is rejected on rebuild. | `test_capsule.mjs` (7) |
| File-type guard + adoption bar | Report-only for order-sensitive formats, decode media, skip opaque binaries; adopt only on a wide win over the incumbent codec. | `test_policy.mjs` (15) |
| Task-description analyzer (non-AI) | Reads a task into requirements, dependencies, constraints, and the points where the spec collapses into the undefinable. Deterministic, lossless, no model in the loop. | `test_taskanalyzer.mjs` (13) |
| Stump-task linter (non-AI) | Whole-task audit against the reviewer failure areas + 12-item self-check: method/answer disclosure in any agent-readable file, recovery framing, lazy ambiguity, unstated verifier keys, unprotected ground truth, injection text, paths, token budget. Reports, does not judge. | `test_dynamotask.mjs` (14) |

## Run it yourself

Requires Node 18+ and nothing else.

```bash
npm test            # runs all 16 receipts, prints the table above, exits nonzero on any failure
```

Or run any single proof directly:

```bash
node test/test_relational.mjs      # the ORM-less code<->schema round-trip
node test/benchmark_bytes.mjs      # the honest table on real bytes
node test/test_rewind.mjs          # returnable time
```

## A worked example

Seed finds the rule, keeps a residual, and blooms back to the exact input:

```js
import crypto from 'crypto';
import { seedBest, bloom, shaSeq } from './src/seedbloom.mjs';

const fibs = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34];
const s = seedBest(fibs);                              // picks the rule that fits, residual for the rest
console.log(s.rule, s.ratio.toFixed(1) + 'x');         // 'sum-last-2' (a linear recurrence), 3.3x on this short run
console.log(shaSeq(bloom(s.seed)) === shaSeq(fibs));   // true, lossless always (the ratio grows with the run; see the benchmark)

const noise = [...crypto.randomBytes(200)];
console.log(seedBest(noise).ratio.toFixed(2) + 'x');   // 1.00x, no fake win on snow
```

The mapping that unifies code and database schema, with no ORM:

- Row = **point** (a tuple of coordinates).
- Table = **surface** (rows crossed with columns).
- Foreign key = **address** (a coordinate into another table, not its stored contents).
- Join table = **coupling surface** (`z = x·y`; one row per pair that actually exists).
- Nested object = **address** or **encapsulate**. Every ORM strategy is one of those two, and the
  analyzer picks by one rule, then proves the choice with a round-trip.

## Honest limits (read this part)

This project is disciplined about what it does **not** claim.

- **It is not faster.** Deriving instead of storing saves memory and recompute, not wall-clock time.
  Measured, it is slower. Any speed talk here is about *incremental* recompute (change one input,
  re-derive only the dependents), never about geometry being fast. [Proven floor]
- **The lens is a focus tool, not physics.** The dimensional framing organizes the work. It is not a
  speed claim, not borrowed physics, and it does not make a model "smarter." [Framing]
- **Lossless requires the full rule + residual.** A bare projection is lossy (the product `56` does
  not remember it was `7 × 8`). This engine never collapses-to-discard, only collapses-to-encapsulate,
  and SHA-checks the difference. [Established, by the receipts]
- **It wins exactly the structure that is present.** On random or already-compressed input it reports
  ~1.0x and stays lossless. Forcing a pattern onto flat data would be the failure mode; the benchmark
  is built to catch it. [Established]
- **Roadmap, stated plainly, not hidden.** The current size measure rewards exact-match structure
  (constant, arithmetic, runs). Near-structured data with small-but-varying deltas needs a richer
  rule set (periodic, polynomial, dictionary) and an entropy-level measure. That is an extension, not
  a gap in the core claim.

## Under the hood (optional)

The engine is two primitives (a point and a length) and two operations (stack a length to raise a
dimension, skin a volume to make it a point one level up). Retrieval is two inverse calls: **seed**
gathers and encapsulates (`z = x·y`, lazy, returns the compact generator), **bloom** separates and
expands (`z = x/y`, eager, returns all the parts). They are a faithful inverse only when the seed is
a lossless encapsulation, which is why the residual is never optional. `PRIMER.md` is the full design
constitution and the honest-guard list that governs the build.

The deeper method (how rules are found and applied at scale) is kept private by design. What is
published here is the concept and the runnable results.

---

*Concept and results are Ken Bingham's. The implementation and verification were done with AI
assistance; the ideas and the direction are his. Every number on this page is reproducible with
`npm test`.*
