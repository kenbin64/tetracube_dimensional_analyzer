// test_inheritance.mjs: step 4 receipt: inheritance / polymorphism, principled not free (PRIMER
// build-order step 4 + Section 7 honest note). A subtype ADDS perpendicular axes to a shared base;
// a polymorphic collection is a union of subspaces selected by the `type` coordinate. Two lossless
// relational strategies (single-table discriminator, table-per-class FK) both SHA round-trip, and
// both rebuild the SAME records. Run: node dimensional-analyzer/test/test_inheritance.mjs
import { toSingleTable, fromSingleTable, toClassTables, fromClassTables, extensionAxes } from '../src/inheritance.mjs';
import { sha, canonical } from '../src/dim.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const receipt = (arr) => sha(arr.map(canonical));   // deep: canonicalize each record, so key order never masks a match

// a polymorphic collection: Shape is the base (id, color, type); Circle adds radius, Square adds side.
const shapes = [
  { type: 'circle', id: 1, color: 'red', radius: 5 },
  { type: 'square', id: 2, color: 'blue', side: 4 },
  { type: 'circle', id: 3, color: 'green', radius: 8 },
  { type: 'square', id: 4, color: 'black', side: 9 },
];
const baseKeys = ['id', 'color', 'type'];   // the shared subspace every shape lives in
const src = receipt(shapes);

console.log('\n== a subtype adds perpendicular axes to the shared base ==');
ok(JSON.stringify(extensionAxes(shapes[0], baseKeys)) === '["radius"]', 'circle extends the base with exactly one axis: radius');
ok(JSON.stringify(extensionAxes(shapes[1], baseKeys)) === '["side"]', 'square extends the base with exactly one axis: side');

console.log('\n== strategy A: single-table: one dense surface + a discriminator ==');
const st = toSingleTable(shapes);
ok(JSON.stringify(st.columns) === '["color","id","radius","side","type"]', 'the wide table carries every axis any subtype uses (base + all extensions)');
ok(st.rows[0][st.columns.indexOf('side')] === null, "a circle row leaves the square-only axis (side) null: the surface is sparse where an axis does not apply");
ok(receipt(fromSingleTable(st)) === src, 'single-table round-trips SHA-clean: the per-type schema reads back exactly the axes that apply');

console.log('\n== strategy B: table-per-class: base subspace + one table per subtype, addressed by id ==');
const ct = toClassTables(shapes, baseKeys);
ok(JSON.stringify(ct.base.columns) === '["color","id","type"]', 'the base table holds only the shared axes');
ok(JSON.stringify(ct.subs.circle.columns) === '["radius"]' && JSON.stringify(ct.subs.square.columns) === '["side"]', 'each subtype table holds only its own extension axes (radius / side)');
ok(ct.subs.circle.rows.length === 2 && ct.subs.square.rows.length === 2, 'each subtype table holds only its own rows, linked to the base by id');
ok(receipt(fromClassTables(ct)) === src, 'table-per-class round-trips SHA-clean: base joined to the subtype extension by id');

console.log('\n== the two strategies are equivalent: same source, same rebuild ==');
ok(receipt(fromSingleTable(st)) === receipt(fromClassTables(ct)), 'single-table and table-per-class rebuild byte-identical records: one shape, two honest layouts');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
