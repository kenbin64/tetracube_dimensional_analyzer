// Receipts for the table analyzer: it must FIND real structure (relationships, keys, generators) in a
// dataset nobody annotated, and prove the whole thing round-trips losslessly. Run: node test/test_dataset.mjs
import { analyzeDataset, parseCSV } from '../src/index.mjs';
import assert from 'node:assert';

let pass = 0;
const ok = (name, cond) => { assert.ok(cond, name); console.log('  ok  ' + name); pass++; };

console.log('dataset analyzer receipts');

// A table with: a key (order_id, all distinct), a real functional dependency (dept_id -> dept_name),
// a generated numeric column (qty is arithmetic: 10,12,14,...), and categorical noise (note).
const rows = [];
const depts = { 1: 'sales', 2: 'ops', 3: 'eng' };
for (let i = 0; i < 12; i++) {
  const d = (i % 3) + 1;
  rows.push({ order_id: 1000 + i, dept_id: d, dept_name: depts[d], qty: 10 + 2 * i, note: ['a', 'b'][i % 2] });
}
const r = analyzeDataset(rows);

ok('analysis succeeds', r.ok && r.rows === 12);
ok('discovers the order_id key (an address)', r.candidateKeys.includes('order_id'));
ok('discovers the dept_id -> dept_name relationship (a coupling nobody declared)',
  r.couplings.some((c) => c.from === 'dept_id' && c.to === 'dept_name'));
ok('marks dept_name as a coupled surface, not an independent axis',
  r.columns.find((c) => c.name === 'dept_name').dim === 'surface');
ok('fits a generator to the arithmetic qty column (finds its rule)',
  r.columns.find((c) => c.name === 'qty').rule === 'arith');
ok('qty structure score is high (the rule captured it)',
  r.columns.find((c) => c.name === 'qty').structureScore >= 0.9);
ok('the whole table round-trips LOSSLESSLY (bloom(seed)===table, SHA-checked)', r.receipt.lossless === true);
ok('rank counts the independent axes, fewer than the raw column count',
  r.rank < r.columns.length && r.rank >= 1);

// Honesty guard: on structureless data it must NOT invent structure; it degrades to flat (ratio ~1).
// These values fit no const/arith/fib/quad/cubic rule, so the engine must fall back to raw and still
// stay lossless (Guard 5: win exactly the structure present, and there is none here).
const A = [7, 3, 91, 42, 8, 66, 15, 23, 5, 88, 34, 61, 2, 77, 40, 19, 53, 6, 29, 84];
const B = [50, 12, 3, 77, 41, 9, 63, 28, 1, 95, 17, 44, 70, 6, 33, 88, 5, 52, 20, 66];
const noise = A.map((a, i) => ({ a, b: B[i] }));
const rn = analyzeDataset(noise);
ok('degrades to flat on structureless data (no invented win)', rn.receipt.lossless && rn.receipt.ratio <= 1.35);

// The CSV path the UI will use parses into the same rows shape.
const csv = 'order_id,dept_id,dept_name,qty\n1000,1,sales,10\n1001,2,ops,12\n1002,3,eng,14';
const parsed = parseCSV(csv);
ok('parseCSV yields records the analyzer accepts', parsed.length === 3 && analyzeDataset(parsed).ok);

console.log('\n' + pass + ' checks passed');
