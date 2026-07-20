// relational.mjs: step 2: the ORM-less code <-> schema mapping (PRIMER Section 7).
// A nested record maps to a relational form by ONE rule, not an ORM grab-bag. Each nested object is
// either ENCAPSULATED (a skinned sub-row stored inline) or ADDRESSED (its own table, the parent holds
// a foreign-key coordinate). Both are lossless; the rule only chooses which. This is the whole
// object-relational bridge reduced to the two operations from the primer: address, or encapsulate.
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);   // arrays are one-to-many = step 3

// -- ENCAPSULATE: nested objects stored inline as embedded sub-rows, recursively --
export function encapsulate(record) {
  const columns = [], row = [];
  for (const k of Object.keys(record).sort()) {
    const v = record[k];
    if (isObj(v)) { columns.push({ name: k, kind: 'embedded' }); row.push(encapsulate(v)); }
    else { columns.push({ name: k, kind: 'scalar' }); row.push(v); }
  }
  return { columns, row };
}
export function decapsulate(t) {
  const rec = {};
  t.columns.forEach((c, i) => { rec[c.name] = c.kind === 'embedded' ? decapsulate(t.row[i]) : t.row[i]; });
  return rec;
}

// -- ADDRESS: nested objects extracted to their own tables; the parent holds a foreign-key coordinate --
export function address(record) {
  const db = { tables: {}, root: 'root' };
  db.rootRow = addressInto(record, 'root', db);
  return db;
}
function addressInto(record, tableName, db) {
  if (!db.tables[tableName]) db.tables[tableName] = { columns: null, rows: [] };
  const columns = [], values = [];
  for (const k of Object.keys(record).sort()) {
    const v = record[k];
    if (isObj(v)) {
      const child = `${tableName}__${k}`;
      const fk = addressInto(v, child, db);         // the FK is the child row's coordinate
      columns.push({ name: k, kind: 'fk', table: child });
      values.push(fk);
    } else { columns.push({ name: k, kind: 'scalar' }); values.push(v); }
  }
  const t = db.tables[tableName];
  if (!t.columns) t.columns = columns;
  t.rows.push(values);
  return t.rows.length - 1;
}
export function resolve(db, tableName = db.root, rowIdx = db.rootRow) {
  const t = db.tables[tableName];
  const rec = {};
  t.columns.forEach((c, i) => {
    const v = t.rows[rowIdx][i];
    rec[c.name] = c.kind === 'fk' ? resolve(db, c.table, v) : v;
  });
  return rec;
}

// -- the ONE rule (PRIMER: principled, not free) --
// An entity carries identity (an `id`): it has its own existence, so it is ADDRESSED (own table,
// referenced by coordinate). A value object has no identity, so it is ENCAPSULATED inline. Every ORM
// strategy reduces to this single per-node choice: address a reference, or skin it inline.
export function chooseStrategy(obj) {
  return (isObj(obj) && 'id' in obj) ? 'address' : 'encapsulate';
}

// -- the rule-chosen mapping: address entities, encapsulate value objects, recursively --
export function toRelational(record, rule = chooseStrategy) {
  const db = { tables: {}, root: 'root' };
  db.rootRow = mapInto(record, 'root', db, rule);
  return db;
}
function mapInto(record, tableName, db, rule) {
  if (!db.tables[tableName]) db.tables[tableName] = { columns: null, rows: [] };
  const columns = [], values = [];
  for (const k of Object.keys(record).sort()) {
    const v = record[k];
    if (isObj(v) && rule(v) === 'address') {
      const child = `${tableName}__${k}`;
      columns.push({ name: k, kind: 'fk', table: child });
      values.push(mapInto(v, child, db, rule));      // an addressed entity keeps being decided by the rule
    } else if (isObj(v)) {
      columns.push({ name: k, kind: 'embedded' });
      values.push(encapsulate(v));                   // an encapsulated value object goes fully inline
    } else { columns.push({ name: k, kind: 'scalar' }); values.push(v); }
  }
  const t = db.tables[tableName];
  if (!t.columns) t.columns = columns;
  t.rows.push(values);
  return t.rows.length - 1;
}
export function fromRelational(db, tableName = db.root, rowIdx = db.rootRow) {
  const t = db.tables[tableName];
  const rec = {};
  t.columns.forEach((c, i) => {
    const v = t.rows[rowIdx][i];
    if (c.kind === 'fk') rec[c.name] = fromRelational(db, c.table, v);
    else if (c.kind === 'embedded') rec[c.name] = decapsulate(v);
    else rec[c.name] = v;
  });
  return rec;
}
