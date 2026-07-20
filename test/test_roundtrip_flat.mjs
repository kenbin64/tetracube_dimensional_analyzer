// test_roundtrip_flat.mjs: THE RECEIPT for build-order step 1 (PRIMER Section 7 & 8).
// Proves the base case row = point is LOSSLESS: a flat record survives the full round-trip
//   record -> point -> table schema+row -> point -> record
// with a byte-identical SHA. If this ever fails, the one-to-one mapping is broken at the base.
// Run: node dimensional-analyzer/test/test_roundtrip_flat.mjs
import { recordToPoint, pointToRecord, pointToSchemaRow, schemaRowToPoint, sha } from '../src/dim.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };

// Deliberately varied: unsorted keys, missing fields, null, int/float/bool/text: the analyzer must
// not care about incidental key order and must preserve every value and its type exactly.
const records = [
  { id: 1, name: 'Ada', age: 36, active: true },
  { age: 30, id: 2, name: 'Grace' },
  { id: 3, name: null, score: 9.5, active: false },
  { note: 'single-axis point' },
  {},
];

console.log('\n== base case: a flat record round-trips through the dimensional model, SHA-identical ==');
for (const rec of records) {
  const point = recordToPoint(rec);
  const schemaRow = pointToSchemaRow(point);
  const back = pointToRecord(schemaRowToPoint(schemaRow));
  ok(sha(rec) === sha(back), `record<->point<->schema+row round-trips lossless: ${JSON.stringify(rec)}`);
}

console.log('\n== the mappings are the ones the primer claims (row=point, table=surface columns) ==');
{
  const rec = { id: 7, name: 'x' };
  const point = recordToPoint(rec);
  ok(point.axes.length === 2 && point.coord.length === 2, 'a 2-field record is a point on 2 axes (id, name)');
  const sr = pointToSchemaRow(point);
  ok(sr.table.columns.length === 2 && sr.row.length === 2, 'the point is a 2-column table with a 1-row body');
  ok(sr.table.columns.find((c) => c.name === 'id').type === 'int', 'each axis carries its inferred unit (id is int)');
}

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
