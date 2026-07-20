// dataset.mjs: the table analyzer (PRIMER Section 6 applied to real tabular data).
// Given rows (array of records), it does the four moves: unitize each column, count the independent
// axes (rank), find the couplings (the relationships it DISCOVERS, not ones you declare), and prove
// losslessness with a seed/bloom SHA round-trip. Honest guards hold: it reports how much structure is
// actually present (degrades to flat, per Guard 5), it wins exactly the structure present, and every
// claim is a number backed by the round-trip receipt (Guard 6). No speed claim anywhere (Guard 3).
import { sha } from './dim.mjs';
import { seedBest, bloom, structureScore, seedSize } from './seedbloom.mjs';

const isNum = (v) => v !== null && v !== '' && v !== undefined && Number.isFinite(Number(v));
const key = (v) => (typeof v === 'object' ? JSON.stringify(v) : String(v));

// Classify one column and, if it is numeric, fit the best generator to it (const/arith/fib/quad/cubic).
function analyzeColumn(name, values) {
  const nonNull = values.filter((v) => v !== null && v !== '' && v !== undefined);
  const distinct = new Set(values.map(key));
  const numeric = nonNull.length > 0 && nonNull.every(isNum);
  const col = {
    name,
    dim: 'line',                       // one independent axis until shown to be coupled
    kind: numeric ? 'numeric' : 'categorical',
    count: values.length,
    distinct: distinct.size,
    cardinality: values.length ? distinct.size / values.length : 0,
  };
  if (numeric) {
    const nums = values.map(Number);
    const best = seedBest(nums);       // the real engine: fit a generator, MDL-gated, lossless
    col.rule = best.rule;              // which generator fit (or 'raw' = no structure, degrade to flat)
    col.structureScore = best.score;   // fraction the rule captured (Guard 5: how dimensional is this)
    col.ratio = best.ratio;            // cells saved by the generator vs raw (1.0 = flat, per Guard)
    col._seed = best.seed;             // kept for the round-trip receipt
    col._nums = nums;
  }
  return col;
}

// Discover functional dependencies A -> B: every value of A maps to exactly one value of B.
// This is the coupling (PRIMER: the z=xy surface). We find it from the data; nobody declares it.
function functionalDeps(rows, names) {
  const deps = [];
  for (const a of names) {
    for (const b of names) {
      if (a === b) continue;
      const map = new Map();
      let holds = true;
      for (const row of rows) {
        const ka = key(row[a]);
        const kb = key(row[b]);
        if (map.has(ka)) { if (map.get(ka) !== kb) { holds = false; break; } }
        else map.set(ka, kb);
      }
      if (holds) deps.push({ from: a, to: b });
    }
  }
  return deps;
}

// A candidate key is a column whose values are all distinct: it addresses every row (PRIMER: the
// address). It functionally determines every other column.
function candidateKeys(cols, nRows) {
  return cols.filter((c) => nRows > 1 && c.distinct === nRows).map((c) => c.name);
}

// The main analyzer. Returns a structured, honest report + a losslessness receipt.
export function analyzeDataset(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, why: 'no rows', rows: 0 };
  }
  const names = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const cols = names.map((n) => analyzeColumn(n, rows.map((r) => (n in r ? r[n] : null))));

  // Couplings: functional dependencies (directed) + candidate keys.
  const deps = functionalDeps(rows, names);
  const keys = candidateKeys(cols, rows.length);

  // Rank = independent axes = columns NOT single-column-determined by another (keys excepted, since a
  // key determines everything but is itself independent). Honest simplification, stated as such.
  const determined = new Set(deps.filter((d) => !keys.includes(d.from)).map((d) => d.to));
  const independent = names.filter((n) => !determined.has(n) || keys.includes(n));
  // Mark coupled columns on the report.
  for (const c of cols) if (determined.has(c.name) && !keys.includes(c.name)) c.dim = 'surface';

  // Losslessness receipt: seed every numeric column, bloom it back, and SHA the whole reconstruction
  // against the original. Categorical columns are carried raw (still lossless, just no generator win).
  const original = rows.map((r) => names.map((n) => (n in r ? r[n] : null)));
  const rebuilt = names.map((n) => {
    const c = cols.find((x) => x.name === n);
    if (c.kind === 'numeric') return bloom(c._seed);
    return rows.map((r) => (n in r ? r[n] : null));
  });
  const rebuiltRows = rows.map((_, i) => names.map((__, j) => rebuilt[j][i]));
  const shaIn = sha(original.map((row) => row.map((v) => (isNum(v) ? Number(v) : v))));
  const shaOut = sha(rebuiltRows);
  const lossless = shaIn === shaOut;

  // Honest size accounting in CELLS: raw = rows*cols; seeded = numeric seed sizes + raw categorical.
  const rawCells = rows.length * names.length;
  let seededCells = 0;
  for (const c of cols) seededCells += c.kind === 'numeric' ? seedSize(c._seed) : rows.length;

  // Overall structure score: cell-weighted average of numeric columns' structure (0 if none numeric).
  const numCols = cols.filter((c) => c.kind === 'numeric');
  const structure = numCols.length
    ? numCols.reduce((s, c) => s + structureScore(c._seed), 0) / numCols.length
    : 0;

  // Strip internal fields from the public report.
  const publicCols = cols.map(({ _seed, _nums, ...rest }) => rest);

  return {
    ok: true,
    rows: rows.length,
    columns: publicCols,
    rank: independent.length,             // independent axes (PRIMER: count)
    independentAxes: independent,
    couplings: deps,                      // discovered relationships (PRIMER: the z=xy surfaces)
    candidateKeys: keys,                  // discovered addresses
    structureScore: structure,            // how dimensional is this data (Guard 5)
    receipt: {
      lossless,                           // bloom(seed(table)) === table, SHA-checked (Guard 4/6)
      shaIn: shaIn.slice(0, 16),
      shaOut: shaOut.slice(0, 16),
      cellsRaw: rawCells,
      cellsSeeded: seededCells,
      ratio: seededCells ? rawCells / seededCells : 1,  // wins exactly the structure present (Guard 5)
    },
  };
}

// Minimal, dependency-free CSV -> rows parser for the server/UI path. Numbers are coerced by the
// analyzer, so values stay as strings here; empty fields become null.
export function parseCSV(text) {
  const lines = String(text).replace(/\r\n?/g, '\n').split('\n').filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const split = (line) => {
    const out = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (ch === '"') q = false;
        else cur += ch;
      } else if (ch === '"') q = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const header = split(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = split(line);
    const rec = {};
    header.forEach((h, i) => { const v = cells[i]; rec[h] = v === undefined || v === '' ? null : v; });
    return rec;
  });
}
