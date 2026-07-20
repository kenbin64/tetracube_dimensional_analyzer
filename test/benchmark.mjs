// benchmark.mjs: the honest, GEP-shaped benchmark (PRIMER Guards 4, 5, and Ken's "no collapse to
// zero"). Runs a spread of data "types" through seedBest (rule repertoire + MDL gate) and prints
// {best rule, structure score, ratio, lossless}. The invariants it enforces are the honesty of the
// whole framework: lossless EVERYWHERE, ~1.0x on random (no fake win on snow), a real win where there
// is structure, and NEVER a collapse to zero (the seed floor is always the generator, never nothing).
// Run: node dimensional-analyzer/test/benchmark.mjs
import { seedBest, bloom, shaSeq } from '../src/seedbloom.mjs';

const N = 40;
const mkFib = (n) => { const a = [0, 1]; while (a.length < n) a.push(a[a.length - 1] + a[a.length - 2]); return a.slice(0, n); };
const mkArith = (n, d) => Array.from({ length: n }, (_, i) => 3 + i * d);
const mkConst = (n, v) => Array(n).fill(v);
const mkSemi = (n) => { const a = mkArith(n, 2); a[Math.floor(n / 2)] += 17; a[Math.floor(n / 4)] -= 5; return a; };   // structure + a little noise
const mkRandom = (n) => { let s = 12345; const a = []; for (let i = 0; i < n; i++) { s = (s * 1103515245 + 12345) & 0x7fffffff; a.push(s % 1000); } return a; };   // deterministic snow

const cases = [
  ['fibonacci (pure structure)', mkFib(N)],
  ['arithmetic (pure structure)', mkArith(N, 3)],
  ['constant (pure structure)', mkConst(N, 9)],
  ['semi-structured (arith + 2 spikes)', mkSemi(N)],
  ['random / snow (incompressible)', mkRandom(N)],
];

console.log('\n  ' + 'type'.padEnd(38) + '| rule  | structure |  ratio | lossless');
console.log('  ' + '-'.repeat(78));
let allLossless = true, anyZero = false, randomRatio = 1, fibRatio = 1;
for (const [name, seq] of cases) {
  const r = seedBest(seq);
  const lossless = shaSeq(bloom(r.seed)) === shaSeq(seq);
  allLossless = allLossless && lossless;
  anyZero = anyZero || r.ratio === 0 || r.size === 0;
  if (name.startsWith('random')) randomRatio = r.ratio;
  if (name.startsWith('fibonacci')) fibRatio = r.ratio;
  console.log(`  ${name.padEnd(38)}| ${r.rule.padEnd(6)}| ${r.score.toFixed(2).padStart(9)} | ${(r.ratio.toFixed(2) + 'x').padStart(6)} | ${lossless ? 'YES' : 'NO'}`);
}
console.log('  ' + '-'.repeat(78));

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };
console.log('\n== honest invariants (the benchmark cannot be cheated) ==');
ok(allLossless, 'EVERY type round-trips lossless: bloom(seed(x)) === x, structure and snow alike');
ok(randomRatio <= 1.01, `random reads ~1.0x (${randomRatio.toFixed(2)}x): no fake win on snow, exactly like GEP`);
ok(fibRatio > 3, `pure structure wins big (fibonacci ${fibRatio.toFixed(1)}x): the win is real where structure is real`);
ok(!anyZero, 'NO type collapses to zero: the seed floor is always the generator, never nothing (Ken\'s guard)');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
