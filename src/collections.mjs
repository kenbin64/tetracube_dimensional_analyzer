// collections.mjs: step 3: one-to-many and many-to-many (PRIMER build-order step 3), the coupling
// cases. An array of children is a child table (one-to-many), order preserved by an index. A shared
// entity is stored ONCE and referenced many times (dedup, sharing preserved). A many-to-many relation
// is a JOIN TABLE, one row per pair that actually exists: which is literally z=xy: the two axes
// crossed, a row wherever the coupling is real (the sparse surface, not the full cross product).
// All lossless.
import { encapsulate, decapsulate } from './relational.mjs';

// -- one-to-many: array <-> child table (order preserved via an explicit index) --
export function arrayToTable(items) {
  return { columns: ['idx', 'item'], rows: items.map((item, idx) => [idx, encapsulate(item)]) };
}
export function tableToArray(t) {
  return t.rows.slice().sort((a, b) => a[0] - b[0]).map((r) => decapsulate(r[1]));
}

// -- dedup: entities (objects with `id`) stored ONCE in a pool; occurrences become {_ref:id}; rehydrate
//    restores the SAME object for the same id, so sharing survives the round-trip (no duplication) --
export function dedupEntities(records) {
  const pool = {};
  const internFields = (obj) => { const o = {}; for (const k of Object.keys(obj)) o[k] = intern(obj[k]); return o; };
  function intern(v) {
    if (Array.isArray(v)) return v.map(intern);
    if (v && typeof v === 'object') {
      if ('id' in v) { if (!(v.id in pool)) pool[v.id] = internFields(v); return { _ref: v.id }; }
      return internFields(v);
    }
    return v;
  }
  return { pool, refs: records.map(intern) };
}
export function rehydrate({ pool, refs }) {
  const cache = {};
  const resolveFields = (obj) => { const o = {}; for (const k of Object.keys(obj)) o[k] = resolve(obj[k]); return o; };
  function resolve(v) {
    if (Array.isArray(v)) return v.map(resolve);
    if (v && typeof v === 'object') {
      if ('_ref' in v) { if (!(v._ref in cache)) cache[v._ref] = resolveFields(pool[v._ref]); return cache[v._ref]; }
      return resolveFields(v);
    }
    return v;
  }
  return refs.map(resolve);
}

// -- many-to-many: a relation is a JOIN TABLE, one row per existing (a,b) pair. This IS z=xy: the two
//    axes crossed, a row only where the coupling is real (the sparse surface, not the M*N cross). --
export function toJoinTable(pairs) { return pairs.map(({ a, b }) => [a, b]); }
export function fromJoinTable(rows) { return rows.map(([a, b]) => ({ a, b })); }
