// benchmark_bytes.mjs: the honest benchmark on REAL bytes (PRIMER Guards 4, 5, and "no collapse to
// zero"). Runs a spread of real inputs through seedBest (rule repertoire + MDL gate) and prints the
// honest table. The point is the shape, not a headline number: the numeric/linear rules win big on
// their domain (sorted columns, counters, runs), correctly read ~1.0x where they do not fit (text
// bytes, random, and genuinely gzip-compressed data), stay lossless everywhere, and never hit zero.
// Run: node dimensional-analyzer/test/benchmark_bytes.mjs
import zlib from 'zlib';
import crypto from 'crypto';
import { seedBest, bloom, shaSeq } from '../src/seedbloom.mjs';

// -- real-ish inputs --
const sortedColumn = (n) => { let v = 1000; const a = []; for (let i = 0; i < n; i++) { a.push(v); v += 5; } return a; };   // auto-increment column, constant delta
const repetitive = (n) => Array(n).fill(42);                                              // a constant run
const counter = (n) => Array.from({ length: n }, (_, i) => i);                            // 0,1,2,... arithmetic
const sawtoothBytes = (n) => Array.from({ length: n }, (_, i) => i % 256);                // byte-safe structured input to gzip
const randomBytes = (n) => [...crypto.randomBytes(n)];                                     // TRUE snow (cryptographic random)
const jsonBytes = (o) => [...Buffer.from(JSON.stringify(o))];                             // JSON text as byte values
const gzipBytes = (arr) => [...zlib.gzipSync(Buffer.from(arr))];                          // already-compressed bytes

const jsonObj = { users: Array.from({ length: 20 }, (_, i) => ({ id: i, name: 'user' + i, active: i % 2 === 0 })) };

const cases = [
  ['sorted integer column (db column)', sortedColumn(200)],
  ['repetitive column (all 42)', repetitive(200)],
  ['counter 0..399 (arithmetic)', counter(400)],
  ['JSON text as bytes (outside numeric rules)', jsonBytes(jsonObj)],
  ['random bytes (snow)', randomBytes(200)],
  ['gzip of a structured input (already compressed)', gzipBytes(sawtoothBytes(600))],
];

console.log('\n  ' + 'input'.padEnd(46) + '| rule  | structure |  ratio | lossless');
console.log('  ' + '-'.repeat(84));
let allLossless = true, anyZero = false;
const ratios = {};
for (const [name, seq] of cases) {
  const r = seedBest(seq);
  const lossless = shaSeq(bloom(r.seed)) === shaSeq(seq);
  allLossless = allLossless && lossless;
  anyZero = anyZero || r.ratio === 0 || r.size === 0;
  ratios[name] = r.ratio;
  console.log(`  ${name.padEnd(46)}| ${r.rule.padEnd(6)}| ${r.score.toFixed(2).padStart(9)} | ${(r.ratio.toFixed(2) + 'x').padStart(6)} | ${lossless ? 'YES' : 'NO'}`);
}
console.log('  ' + '-'.repeat(84));
console.log('  (the numeric/linear repertoire wins on sorted/counter/run data; text and compressed');
console.log('   data correctly read ~1.0x: they need other rules, which is the honest roadmap, not a lie.)');

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };
console.log('\n== honest invariants on real bytes ==');
ok(allLossless, 'EVERY input round-trips lossless (bloom(seed(x)) === x), all types');
ok(ratios['random bytes (snow)'] <= 1.05, `true-random bytes read ~1.0x (${ratios['random bytes (snow)'].toFixed(2)}x): no fake win on snow`);
ok(ratios['gzip of a structured input (already compressed)'] <= 1.1, `already-gzipped bytes read ~1.0x (${ratios['gzip of a structured input (already compressed)'].toFixed(2)}x): no double-dipping on compressed input`);
ok(ratios['sorted integer column (db column)'] > 3 && ratios['counter 0..399 (arithmetic)'] > 3, 'structured columns win big (sorted + counter > 3x): the win is real where structure is real');
ok(!anyZero, 'NO input collapses to zero: the seed floor is always the generator (Ken\'s guard)');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
