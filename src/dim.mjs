// dim.mjs: the dimensional model, base case.
// Build-order step 1 (PRIMER Section 8): a flat record is a POINT. Its axes are the keys, its
// coordinate is the values. A point maps one-to-one to a table schema + row (PRIMER Section 7:
// row = point, table = surface). Everything harder (nesting, couplings, curvature) is added on top
// of this, one test at a time. Nothing here may lose information (PRIMER Guard 4).
import { sha256Utf8 } from './sha256.mjs';

// Canonical form: keys sorted, so JSON serialization is deterministic and the SHA is stable
// regardless of the input key order. This is the honest baseline for the round-trip receipt.
export function canonical(record) {
  const out = {};
  for (const k of Object.keys(record).sort()) out[k] = record[k];
  return out;
}

export const sha = (obj) => sha256Utf8(JSON.stringify(canonical(obj)));

// The unit of an axis, inferred (PRIMER Section 5: unitize each axis). For a flat record this is the
// value's type; it is what makes a column a typed axis rather than an untyped blob.
function typeOf(v) {
  if (v === null) return 'null';
  if (typeof v === 'boolean') return 'bool';
  if (Number.isInteger(v)) return 'int';
  if (typeof v === 'number') return 'float';
  return 'text';
}

// record -> POINT: axes = sorted keys (an origin+unit per axis), coord = the values at those axes.
export function recordToPoint(record) {
  const axes = Object.keys(record).sort();
  return { axes, coord: axes.map((a) => record[a]) };
}

// POINT -> record: read each axis's value back off the coordinate.
export function pointToRecord(point) {
  const r = {};
  point.axes.forEach((a, i) => { r[a] = point.coord[i]; });
  return r;
}

// POINT -> table schema + row. Columns are the axes (name + inferred unit/type); the row is the
// coordinate. This is the one-to-one map, no ORM strategy, just address the values by column.
export function pointToSchemaRow(point) {
  return {
    table: { columns: point.axes.map((a, i) => ({ name: a, type: typeOf(point.coord[i]) })) },
    row: point.coord.slice(),
  };
}

// table schema + row -> POINT: axis names come from the columns, the coordinate is the row.
export function schemaRowToPoint(sr) {
  return { axes: sr.table.columns.map((c) => c.name), coord: sr.row.slice() };
}
