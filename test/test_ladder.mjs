// test_ladder.mjs: the skin-and-recurse receipt (PRIMER: "encapsulate to 1 in the next dimension,
// then start again at a higher order"). Proves that recursion is LOSSLESS at every rung.
// Analogy: a rung's points are constituents; skinning them into one point elects a representative
// (the seed) that stands for the whole rung at the order above; blooming unwraps the representative
// back to its constituents. bloom(seed(x)) === x is checked at every rung.
// Run: node dimensional-analyzer/test/test_ladder.mjs
import { fibRule, seed, bloom, shaSeq, skinLevel, bloomLevel } from '../src/seedbloom.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };

console.log('\n== the ladder: encapsulate to a point, that point is 1 in the next order, recurse, lossless every rung ==');
// Level 0 constituents: three numeric sequences (only the first is Fibonacci; the rest ride residual).
const leaves = [[0, 1, 1, 2, 3, 5, 8, 13], [3, 6, 9, 12, 15, 18], [7, 7, 7, 7, 7, 7, 7]];

// Rung 0 -> 1: seed each leaf into a point (its representative).
const rung1 = leaves.map((seq) => seed(seq, fibRule));
leaves.forEach((seq, i) => ok(shaSeq(bloom(rung1[i])) === shaSeq(seq), `rung 0->1 lossless: leaf ${i} blooms back exact`));

// Rung 1 -> 2: encapsulate the WHOLE rung into a single point (one representative for the level).
const rung2 = skinLevel(rung1);
ok(shaSeq(bloomLevel(rung2)) === shaSeq(rung1), 'rung 1->2 lossless: the level encapsulates to one point and unwraps to the same points');

// FULL ladder: from the top point, bloom all the way back down to the original leaves.
const down = bloomLevel(rung2).map((p) => bloom(p));
ok(shaSeq(down) === shaSeq(leaves), 'FULL LADDER: from the top point, bloom recovers every original leaf, SHA-identical');

// Rung 2 -> 3 -> back: the top point is itself just a unit at a higher order; wrap it again and return.
const rung3 = skinLevel([rung2, skinLevel([seed([1, 1, 2, 3, 5], fibRule)])]);
const backRung2 = bloomLevel(rung3)[0];
ok(shaSeq(bloomLevel(backRung2).map((p) => bloom(p))) === shaSeq(leaves),
  'rung 2->3->down lossless: the ladder recurses to a higher order and returns exact (starts again at a higher order)');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
