// test_relational.mjs: step 2 receipt: the ORM-less code <-> schema mapping (PRIMER Section 7).
// A nested record maps to relational form losslessly by ONE rule. Both strategies round-trip
// SHA-clean, the rule chooses (entity -> address, value object -> encapsulate), and the chosen
// mixed mapping round-trips too. This is where "no ORM, one-to-one" stops being a slogan.
// Run: node dimensional-analyzer/test/test_relational.mjs
import { encapsulate, decapsulate, address, resolve, chooseStrategy, toRelational, fromRelational } from '../src/relational.mjs';
import { shaSeq } from '../src/seedbloom.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };
const deepCanon = (v) => Array.isArray(v) ? v.map(deepCanon)
  : (v && typeof v === 'object') ? Object.keys(v).sort().reduce((o, k) => (o[k] = deepCanon(v[k]), o), {}) : v;
const eq = (a, b) => shaSeq(deepCanon(a)) === shaSeq(deepCanon(b));

// An order with a customer (an ENTITY, has id) and a ship-to address (a VALUE object, no id).
const record = {
  id: 1,
  name: 'Order #1',
  customer: { id: 42, name: 'Ada', email: 'ada@x.com' },
  shipTo: { city: 'London', zip: 'EC1', country: 'UK' },
};

console.log('\n== both pure strategies round-trip lossless (nested record <-> relational) ==');
ok(eq(decapsulate(encapsulate(record)), record), 'ENCAPSULATE round-trips SHA-clean (nested objects stored inline)');
ok(eq(resolve(address(record)), record), 'ADDRESS round-trips SHA-clean (nested objects as their own tables + FK)');
ok(eq(decapsulate(encapsulate(record)), resolve(address(record))), 'encapsulate and address yield the SAME record: two representations, one truth');

console.log('\n== the ONE rule chooses per nested object, principled not ad-hoc ==');
ok(chooseStrategy(record.customer) === 'address', 'entity (has id) -> ADDRESS (its own existence, its own table)');
ok(chooseStrategy(record.shipTo) === 'encapsulate', 'value object (no id) -> ENCAPSULATE (inline, owned by the parent)');

console.log('\n== the rule-chosen mixed mapping is lossless AND has the right shape ==');
const db = toRelational(record);
ok(eq(fromRelational(db), record), 'the mixed mapping (address entities, encapsulate values) round-trips SHA-clean');
ok('root__customer' in db.tables, 'the entity got its OWN table (customer was addressed)');
ok(!('root__shipTo' in db.tables), 'the value object did NOT get a table (shipTo was encapsulated inline)');
ok(db.tables.root.columns.find((c) => c.name === 'customer').kind === 'fk', 'the parent holds a foreign-key coordinate to the customer table');

console.log('\n== deeper nesting: an entity inside an entity, addressed all the way down ==');
const deep = { id: 1, sub: { id: 2, leaf: { id: 3, v: 'x' } } };
ok(eq(fromRelational(toRelational(deep)), deep), 'nested entities address recursively and round-trip lossless');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
