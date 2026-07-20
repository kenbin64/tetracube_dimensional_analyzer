// test_collections.mjs: step 3 receipt: one-to-many and many-to-many (PRIMER build-order step 3).
// The coupling cases. array <-> child table (order preserved), shared entity stored once (sharing
// preserved), and many-to-many as a join table that IS the sparse z=xy coupling surface. All lossless.
// Run: node dimensional-analyzer/test/test_collections.mjs
import { arrayToTable, tableToArray, dedupEntities, rehydrate, toJoinTable, fromJoinTable } from '../src/collections.mjs';
import { shaSeq } from '../src/seedbloom.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const deepCanon = (v) => Array.isArray(v) ? v.map(deepCanon)
  : (v && typeof v === 'object') ? Object.keys(v).sort().reduce((o, k) => (o[k] = deepCanon(v[k]), o), {}) : v;
const eq = (a, b) => shaSeq(deepCanon(a)) === shaSeq(deepCanon(b));

console.log('\n== one-to-many: array <-> child table, order preserved, lossless ==');
const items = [{ sku: 'A', qty: 2 }, { sku: 'B', qty: 1 }, { sku: 'C', qty: 5 }];
ok(eq(tableToArray(arrayToTable(items)), items), 'array -> child table -> array round-trips SHA-clean, order intact');
const t = arrayToTable(items);
ok(t.rows.length === 3 && t.rows[0][0] === 0 && t.rows[2][0] === 2, 'each child row carries its position index (the ordering coordinate)');

console.log('\n== dedup: a shared entity is stored ONCE and referenced many times, sharing preserved ==');
const cust = { id: 42, name: 'Ada' };
const orders = [{ id: 1, customer: cust, total: 10 }, { id: 2, customer: cust, total: 20 }];
const d = dedupEntities(orders);
ok(Object.keys(d.pool).length === 3, '2 orders + 1 shared customer = 3 pooled entities (customer stored ONCE, not twice)');
const rehydrated = rehydrate(d);
ok(eq(rehydrated, orders), 'dedup round-trips lossless (rehydrate === original)');
ok(rehydrated[0].customer === rehydrated[1].customer, 'the shared customer is the SAME object after rehydrate (sharing preserved, not duplicated)');

console.log('\n== many-to-many: the join table IS the sparse z=xy coupling surface ==');
const enroll = [{ a: 's1', b: 'cX' }, { a: 's1', b: 'cY' }, { a: 's2', b: 'cX' }];
const jt = toJoinTable(enroll);
ok(jt.length === 3, 'the join table holds one row per pair that actually exists');
ok(eq(fromJoinTable(jt), enroll), 'the join table round-trips lossless');
const students = [...new Set(enroll.map((e) => e.a))], courses = [...new Set(enroll.map((e) => e.b))];
ok(jt.length < students.length * courses.length,
  `it is the SPARSE surface: ${jt.length} real pairs of ${students.length * courses.length} possible (z=xy where the coupling is real)`);

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
