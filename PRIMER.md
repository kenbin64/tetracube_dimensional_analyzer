# The Dimensional Analyzer, Primer and Build Constitution

*A stable reference for building and proving the universal analyzer. Read this to re-anchor
before any session. When a clever idea conflicts with Section 4 (Honest Guards), the guards win.*

Status: BUILT and receipted, 79/79 green. Section 7's falsifiable receipt (a lossless SHA round-trip
on the code<->schema domain) is green, and the whole build order (steps 1-6 + registry + rewind + a
real-bytes benchmark) is done and self-testing. See Section 6 for the receipt list. What remains is
extension (richer rules, entropy-level sizing) and packaging (a README), never the core claim.

---

## 0. What we are building

Software that reads any input, decomposes it into its **dimensional structure** (independent axes,
couplings, curvature), and answers by **addressing and propagating** over that structure instead of
parsing it flat. This is not compression (that is GEP, already proven). This is analysis: divide into
parts, combine, find patterns, build hierarchies, extract information, respond.

## 1. The one-line thesis

**Store the generator, derive the field.** Any structure is independent axes (addressable
coordinates) plus couplings (surfaces kept whole) plus curvature (bent surfaces). Address the
independent, encapsulate the coupled, lose nothing, and prove it with a SHA round-trip.

## 2. The whole machine: two primitives, two operations

**Primitives**
- **Point** (0-D): the discrete unit, "1 at limit 0" (the Dirac delta: weight 1, width 0). The
  addressable reference, the place you measure from.
- **Length** (1-D): the line, the continuous unit. The only true measurement. Width, height, depth
  are the same length relabeled by perpendicular orientation (Pythagoras is the proof: unlike units
  cannot combine into one diagonal, so they were always one unit).

Two atoms: a point and a length. "1 and 1."

**Operations**
- **Stack**: sweep the line to raise a dimension (line, plane, volume). R^n is R multiplied by
  itself n times; everything above the line is the line stacked.
- **Skin**: wrap a volume in a boundary, encapsulate it as one discrete unit, and it becomes a
  **point in the next dimension**. (Coarse-graining in physics, encapsulation in code, a 3D "now" as
  one point on the time axis.)

**Access**
- **Address**: compute a coordinate directly. `A[i][j][k]` is a stack of collapses, O(1).
- **Traverse**: walk a tree branch to branch, O(depth).
- Prefer addressing. A dimensional layout is directly addressable; a tree is not. This is the
  array / hash / embedding advantage, established data-structure design, surfaced by the lens, not
  invented by it.

## 3. The dimensional schema

| Dim | Is | Diagnostic question | Example |
|---|---|---|---|
| Point (0-D) | an atom, no internal variation | one collapsed value? | a row, a literal, a fact |
| Line (1-D) | one independent axis | varies along exactly one direction? | a column, a sequence, a spectrum |
| Surface (2-D) | two COUPLED axes (z=xy) | do two factors interact, does fixing one change the other? | a join table, a trade-off |
| Volume (3-D) | three independent axes | three irreducible factors? | a 3-key cube |
| Manifold (curved) | the coupling bends with context (z=xy^2) | do the rules change across the space? | context-gated behavior |

The engine is four moves: **count** the independent axes (rank), **couple** them (find the
surfaces), **collapse** to a point (the verdict), **check curvature** (where the perpendicular frame
rotates).

## 4. HONEST GUARDS (these override any clever idea)

This is the section that keeps the project real. The framework is a FOCUS and organizing lens,
nothing more grandiose.

1. **The lens is a focus tool.** [Framing] Not physics, not "AI gets smarter", not a speed claim
   about manifolds. Label every claim [Established] / [Framing] / [Observation] / [To test].
2. **Addressing beats traversal is [Established]** data-structure design (arrays, hashing,
   embeddings). The lens surfaces it, it does not invent it. Never call it manifold-magic.
3. **Derive-not-store saves memory and recompute, not time.** [Proven floor] It measured slower, not
   faster. Any "fast" claim must be about incremental and parallel-where-independent recompute, never
   about geometry being fast.
4. **"No information lost" is true only with full encapsulation** (rule + residual). A naive
   projection IS lossy: the product xy loses its factors, the flat sine loses its phase. Rule:
   collapse-to-encapsulate, never collapse-to-discard. Prove losslessness with a SHA round-trip.
5. **Measure how much structure is actually present.** As GEP wins exactly the geometry present and
   correctly returns 1.0x on random, the analyzer must report "how dimensional is this input?" and
   degrade to flat when there is little. Forcing point/line/surface onto flat or random data is the
   failure mode (a Procrustean bed).
6. **Every grand claim pays rent in a number.** "It unifies everything" is a slogan until one domain
   round-trips losslessly. Anchor the big claim to the small receipt.
7. **IP discipline.** Publish concept plus verifiable results, withhold the method (the lens
   application and the reliability method stay private).

## 5. Representation

- The core object is the **coordinate / signature**, not a graph walk. The graph is how you *derive*
  the axes; the coordinate is how you *access* them.
- Every axis needs an **origin** (reference point) and a **unit** (its "1"). **First job on any
  axis: unitize** it, find its natural unit and rescale, so every axis is one length. Skip this and
  you are comparing dollars to years and calling the nonsense insight.
- A signature = **stack of collapses** (the orthogonal address) + **residue** (the couplings and
  curvature, where collapse loses information). Address the clean part for free; keep the residue
  whole.
- For curved structure use a **moving frame** (local charts), not fixed global axes. The **rotation
  rate of the frame is the curvature**: zero means flat and directly addressable, nonzero means a
  manifold that must be sectioned (Fourier / PCA / charts).

## 6. The analyzer algorithm (recursive)

At each level:
1. **Unitize** each candidate axis (origin + unit).
2. **Count** the independent axes, then **stack** them into a coordinate (the address).
3. **Find couplings**, then **skin** each into an encapsulated surface-unit, kept whole, never
   flattened to a scalar.
4. **Find curvature**, use local charts / a moving frame, record the rotation rate.
5. **Treat each skinned unit as a point** at the level above.
6. **Recurse.**

Output: a hierarchy where every node is a **point you can address** and a **volume you can open**,
losslessly.

**Respond by propagation.** Once the generators are found, changing an input re-derives the
dependent field: the spreadsheet recalc model. Propagation parallelism equals the dimensional
independence: independent axes recompute in parallel, couplings force sequence. (Not magic speed,
just incremental derive-the-field, per Guard 3.)

**Retrieval: seed and bloom (the two ways to call information).** Two inverse calls on any node.
**Seed** (z=xy, gather and collapse) returns the compact encapsulated unit: the point, the address,
the generator. Lazy. **Bloom** (z=x/y, separate and expand) returns all the parts: the
decomposition, the join, the derived field. Eager. They are a faithful inverse ONLY when the seed is
a lossless encapsulation (Guard 4): a lossy seed (the bare product 56) blooms ambiguously
(7x8? 28x2?), turning bloom into a factorization search. `bloom(seed(x)) === x`, SHA-checked, is the
losslessness receipt. **Public API = seed, bloom, propagate** (propagate = re-bloom the dependents
when an input changes).

**Method (settled): pattern rule + residual, 100% lossless.** The seed is a REPRESENTATION, not
literal compression. It re-expresses data as a rule that predicts plus a residual that carries every
deviation, so `bloom(seed(x)) === x` ALWAYS (GEP's SHA-verified rule+residual capsule). Getting
smaller is a side effect of how much structure the rule exposed (the structure score), never the
pitch; structureless data stays lossless but gains nothing (GEP's 1.0x on random). Intuition: the
seed is a **representative**, the bloom is its **constituents**. You address and act through the
representative (one office speaks for the whole district); the residual is the voter roll that makes
the bloom exact, and its size is how well the representative captures the district.

*Implemented and receipted (79 green checks):*
- *`src/dim.mjs` + `test_roundtrip_flat.mjs`: base case, row=point (8).*
- *`src/seedbloom.mjs` + `test_seedbloom_fib.mjs`: seed/bloom = rule+residual, structure score, lossless on structure AND noise (6).*
- *`test_ladder.mjs`: skin-and-recurse lossless at every rung (6).*
- *`test/benchmark.mjs`: rule repertoire + MDL gate; honest table (wins on structure, 1.0x on snow, zero nowhere, lossless everywhere) (4).*
- *`test/benchmark_bytes.mjs`: the honest table on REAL bytes: sorted/counter/run columns win big, text + true-random + already-gzipped data read ~1.0x, all lossless, none at zero (5).*
- *registry in `seedbloom.mjs` + `test_registry.mjs`: versioned durable rules: detached seeds bloom, immutable versions, missing rule throws (5).*
- *`src/timeline.mjs` + `test_rewind.mjs`: event sourcing / returnable time: replay to any frame, forward=rewind, glass recomposes (8).*
- *`src/relational.mjs` + `test_relational.mjs`: STEP 2: ORM-less code<->schema, address vs encapsulate by one rule, both lossless (10).*
- *`src/collections.mjs` + `test_collections.mjs`: STEP 3: one-to-many (child table, order kept), dedup (shared entity stored once, sharing preserved), many-to-many = join table = the sparse z=xy coupling surface (8).*
- *`src/inheritance.mjs` + `test_inheritance.mjs`: STEP 4: inheritance / polymorphism. A subtype adds perpendicular axes to a shared base; single-table (discriminator) and table-per-class (FK) both round-trip SHA-clean and rebuild byte-identical records. Principled, not free (10).*
- *`src/propagate.mjs` + `test_propagate.mjs`: STEP 6: propagation / recalc (the Mrs Kravitz effect). A change ripples only along local edges, incremental, coupling-ordered, cycle-safe. The "respond" layer (9).*

*Build order status: ALL steps done: 1 (flat), 2 (nesting), 3 (one-to-many / many-to-many),
4 (inheritance / polymorphism), 5 (structure score), 6 (propagation): plus registry + rewind + the
real-bytes benchmark. The core is complete and self-testing: representation + code<->schema mapping +
durability + returnable time + honest benchmark on real bytes + propagation, 79/79 green. No headline
work remains. The honest roadmap (not a gap, an extension): a richer rule set (periodic, polynomial,
dictionary) and an entropy-level size measure so near-structured data with small-but-varying deltas
wins by bit-count, not only exact-match by cell-count.*

## 7. First domain and THE TEST (prove it here first)

**Domain: code object graph <-> database schema** (the ORM-less mapping). Chosen because it is
objective, immediately useful, and it directly exercises "no information lost."

**Mappings**
- Row = **point** (a tuple of coordinates).
- Table = **surface** (rows crossed with columns).
- Foreign key = **address** (a coordinate into another table, not its stored contents).
- Many-to-many join table = **coupling surface** (z=xy; one row per pair that actually exists).
- Nested object = **address** (reference becomes a coordinate) OR **encapsulate** (embed as a skinned
  sub-volume). Every ORM strategy is one of these two.

**THE RECEIPT (the falsifiable test):** map a real object graph and a real schema into the
dimensional model, then **SHA the round-trip**: code -> model -> schema -> model -> code.
- Byte-identical round-trip: the one-to-one unification is proven, and you hold a working ORM-less
  mapper.
- Loses something: that something *is* the object-relational impedance mismatch, now located to the
  exact field. Still a useful result, and an honest negative.

**Honest note:** inheritance, polymorphism, and lazy loading are the coupling and curvature cases.
The lens makes them **principled** (one rule, address or encapsulate), not **free**. Do not claim it
erases the complexity.

## 8. Test-first discipline and north star

- **No claim ships without a test.** Each capability equals a passing receipt.
- **Build order** (smallest lossless round-trip first, add one axis of difficulty at a time):
  1. flat struct <-> table row, SHA-lossless.
  2. add nesting (address vs encapsulate).
  3. add one-to-many and many-to-many (coupling surfaces / join tables).
  4. add inheritance / polymorphism (the hard cases, principled).
  5. add a "how dimensional is this input?" score (the degrade-to-flat honesty from Guard 5).
  6. add propagation (change an input, re-derive the field).
- **North star:** the next test that pays rent. If a session drifts into philosophy, stop and ask
  "what is the smallest round-trip that would prove the next claim?"

## 9. Vocabulary (so we do not drift)

point, line, surface, volume, manifold. axis, coupling, curvature. address vs traverse. stack, skin.
generator, field, residue. **seed** (encapsulate/collapse, z=xy, lazy) vs **bloom** (expand/separate,
z=x/y, eager). unitize, propagate. rank (count of independent axes), rotation rate (curvature).
SHA round-trip / `bloom(seed(x))===x` (the losslessness receipt).

---

*Provenance: distilled from the design conversation of 2026-07-19. Concept and results are Ken's; I
implement and verify. Keep the method private per Guard 7.*
