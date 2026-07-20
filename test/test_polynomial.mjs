// test_polynomial.mjs — receipt for the polynomial (finite-difference) rules. A degree-d run has a
// constant d-th difference, so quad (d=2) and cubic (d=3) collapse it to its base terms with an
// all-zero residual. This must WIN on polynomial data, stay LOSSLESS, keep the honest floor (1.0x on
// data with no matching structure), and never regress the const/arith/fib choices.
// Run: node test/test_polynomial.mjs
import { seedBest, bloom, shaSeq } from '../src/seedbloom.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const N = 60;
const squares = Array.from({ length: N }, (_, i) => i * i);
const cubes = Array.from({ length: N }, (_, i) => i * i * i);
const quadratic = Array.from({ length: N }, (_, i) => 2 * i * i - 3 * i + 5);
const arith = Array.from({ length: N }, (_, i) => 3 + 5 * i);
const fib = (() => { const a = [0, 1]; for (let i = 0; i < N - 2; i++) a.push(a.at(-1) + a.at(-2)); return a; })();
// a nonlinear (quadratic map mod prime) sequence: deterministic but NOT a polynomial in n, so the
// linear finite-difference rules genuinely cannot fit it. This is the honest-floor probe.
const random = (() => { let x = 3; const s = []; for (let i = 0; i < N; i++) { s.push(x); x = (x * x + 7) % 251; } return s; })();

const S = (x) => seedBest(x);
console.log('\n== polynomial runs now compress, and reconstruct exactly ==');
ok(S(squares).seed.rule === 'quad', `squares pick the quad rule (${S(squares).seed.rule})`);
ok(S(cubes).seed.rule === 'cubic', `cubes pick the cubic rule (${S(cubes).seed.rule})`);
ok(S(quadratic).seed.rule === 'quad', `an arbitrary quadratic 2i^2-3i+5 picks quad (${S(quadratic).seed.rule})`);
ok(S(squares).ratio > 5 && S(cubes).ratio > 5, `both win materially (squares ${S(squares).ratio.toFixed(1)}x, cubes ${S(cubes).ratio.toFixed(1)}x)`);

console.log('\n== lossless is untouched (integer-exact finite differences) ==');
for (const [name, d] of [['squares', squares], ['cubes', cubes], ['quadratic', quadratic]])
  ok(shaSeq(bloom(S(d).seed)) === shaSeq(d), `${name}: bloom(seed(x)) === x`);

console.log('\n== no regression: const/arith/fib still pick their smaller rule ==');
ok(S(arith).seed.rule === 'arith', `arith still picks arith, not quad (${S(arith).seed.rule})`);
ok(S(fib).seed.rule === 'sum-last-2', `fibonacci still picks sum-last-2 (${S(fib).seed.rule})`);

console.log('\n== honest floor: structureless data still reports 1.0x, no fake win from the new rules ==');
ok(S(random).rule === 'raw' && S(random).ratio === 1, `pseudo-random stays raw 1.0x (${S(random).ratio.toFixed(2)}x)`);
ok(shaSeq(bloom(S(random).seed)) === shaSeq(random), 'random is still lossless');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
