// inheritance.mjs: step 4: inheritance / polymorphism (PRIMER build-order step 4).
// A subtype ADDS perpendicular axes to a shared base. A polymorphic collection is a union of
// subspaces sharing a base, with `type` as the coordinate that selects which extension axes apply.
// Two lossless relational strategies:
//   single-table: one wide table (base + every subtype's axes) + a type discriminator; nulls where an
//                 axis does not apply (the dense surface, sparsely filled).
//   table-per-class: a base table (the shared subspace) + one table per subtype (its extension axes),
//                    linked by id (the base subspace plus each subtype's perpendicular axes, addressed).
// Both round-trip SHA-clean. The `type` schema (which axes each subtype uses) is what keeps it lossless
// through the nulls, so a legitimately-null field is never confused with an inapplicable axis.

// -- SINGLE-TABLE: one wide table + discriminator; per-type schema tells rebuild which axes apply --
export function toSingleTable(records, typeKey = 'type') {
  const columns = [...new Set(records.flatMap((r) => Object.keys(r)))].sort();
  const schema = {};
  for (const r of records) { const t = r[typeKey]; if (!schema[t]) schema[t] = Object.keys(r).sort(); }
  const rows = records.map((r) => columns.map((k) => (k in r ? r[k] : null)));
  return { columns, rows, schema, typeKey };
}
export function fromSingleTable(t) {
  const ti = t.columns.indexOf(t.typeKey);
  return t.rows.map((row) => {
    const keys = t.schema[row[ti]];
    const rec = {};
    t.columns.forEach((k, i) => { if (keys.includes(k)) rec[k] = row[i]; });
    return rec;
  });
}

// -- TABLE-PER-CLASS: a base table (shared axes) + one table per subtype (its extension axes), by id --
export function toClassTables(records, baseKeys, typeKey = 'type') {
  const base = { columns: [...baseKeys].sort(), rows: [] };
  const subs = {};
  for (const r of records) {
    base.rows.push(base.columns.map((k) => r[k]));
    const type = r[typeKey];
    const extKeys = Object.keys(r).filter((k) => !baseKeys.includes(k)).sort();
    if (!subs[type]) subs[type] = { columns: extKeys, rows: [] };
    subs[type].rows.push({ id: r.id, values: extKeys.map((k) => r[k]) });   // linked to the base by id
  }
  return { base, subs, baseKeys: [...baseKeys], typeKey };
}
export function fromClassTables(db) {
  return db.base.rows.map((baseRow) => {
    const rec = {};
    db.base.columns.forEach((k, i) => { rec[k] = baseRow[i]; });
    const sub = db.subs[rec[db.typeKey]];
    if (sub) {
      const subRow = sub.rows.find((sr) => sr.id === rec.id);
      sub.columns.forEach((k, i) => { rec[k] = subRow.values[i]; });
    }
    return rec;
  });
}

// the extension axes a subtype adds beyond the shared base (its own perpendicular directions)
export function extensionAxes(record, baseKeys) {
  return Object.keys(record).filter((k) => !baseKeys.includes(k)).sort();
}
