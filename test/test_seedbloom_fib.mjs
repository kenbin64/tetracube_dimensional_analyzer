// test_seedbloom_fib.mjs: the seed/bloom warm-up (PRIMER Section 6, the smallest receipt).
// The seed is a lossless REPRESENTATION (a structural re-expression as rule + residual), NOT literal
// compression. It always round-trips; how small it gets is a side effect of how much structure the
// rule exposed. High structure means compact and legible; no structure means lossless but no smaller.
// Run: node dimensional-analyzer/test/test_seedbloom_fib.mjs
import { fibRule, seed, bloom, structureScore, shaSeq } from '../src/seedbloom.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };

console.log('\n== seed/bloom is a lossless REPRESENTATION: store the generator, derive the field ==');
const fib = [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
const sFib = seed(fib, fibRule);
ok(shaSeq(bloom(sFib)) === shaSeq(fib), 'bloom(seed(fib)) === fib, SHA-identical (lossless)');
ok(sFib.residual.every((r) => r === 0), 'the Fibonacci residual is ALL ZEROS: the rule exposed the whole structure');
ok(structureScore(sFib) === 1, 'structure score 1.0: fully generative, {0,1} + one rule regenerates all 12 terms');

console.log('\n== honesty: representation, not compression: structureless data stays lossless but gains nothing ==');
const noise = [0, 1, 5, 2, 9, 3, 7, 4, 8, 6, 10, 0];
const sNoise = seed(noise, fibRule);
ok(shaSeq(bloom(sNoise)) === shaSeq(noise), 'bloom(seed(noise)) === noise: still lossless (rule + residual)');
ok(structureScore(sNoise) === 0, 'structure score 0.0: it honestly reports NO structure under this rule');
ok(sNoise.residual.length === noise.length - 2, 'the residual holds everything: no size win on noise, exactly like GEP returning 1.0x on random');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
