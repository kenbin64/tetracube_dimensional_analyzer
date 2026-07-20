// propagate.mjs: step 6: propagation / recalc (PRIMER "respond by propagation"). The Mrs Kravitz
// effect: every cell knows its immediate neighbors' addresses (its dependents), so a change ripples
// only along the local edges, never a global rescan. Independent cells are untouched (parallel);
// a coupling (a cell that reads another) forces the order. This is the spreadsheet recalc engine, and
// its parallelism equals the dimensional independence (PRIMER Guard 3: incremental, not magic speed).

export function makeSheet() { return { cells: new Map(), lastRecomputes: 0 }; }

function ensure(s, name) {
  if (!s.cells.has(name)) s.cells.set(name, { name, value: undefined, formula: null, deps: [], dependents: new Set(), dirty: false });
  return s.cells.get(name);
}
export function get(s, name) { return s.cells.get(name)?.value; }

// An input cell: a bare value. Setting it ripples to its watchers.
export function setInput(s, name, value) {
  const c = ensure(s, name);
  for (const d of c.deps) ensure(s, d).dependents.delete(name);
  c.formula = null; c.deps = []; c.value = value; c.dirty = false;
  propagateFrom(s, name);
}

// A formula cell: value = fn([dep values]). Registers this cell as a watcher of each dep (Mrs Kravitz).
export function setFormula(s, name, deps, fn) {
  const c = ensure(s, name);
  for (const d of c.deps) ensure(s, d).dependents.delete(name);      // drop stale watch edges
  c.formula = fn; c.deps = deps.slice();
  for (const d of deps) ensure(s, d).dependents.add(name);           // watch each input
  c.dirty = true;
  propagateFrom(s, name);
}

// Mark the changed cell's transitive dependents dirty (the local cascade), then recompute ONLY those,
// each after its own deps have settled (topological order = couplings force the sequence).
function propagateFrom(s, name) {
  s.lastRecomputes = 0;
  const dirtySet = new Set();
  const start = s.cells.get(name);
  if (start.dirty) dirtySet.add(name);                               // a re-defined formula recomputes itself
  const stack = [name];
  while (stack.length) {
    const n = stack.pop();
    for (const dep of s.cells.get(n).dependents) {
      if (!dirtySet.has(dep)) { dirtySet.add(dep); s.cells.get(dep).dirty = true; stack.push(dep); }
    }
  }
  const remaining = new Set([...dirtySet].filter((n) => s.cells.get(n).formula));
  let progress = true;
  while (remaining.size && progress) {
    progress = false;
    for (const n of [...remaining]) {
      const c = s.cells.get(n);
      if (c.deps.every((d) => !remaining.has(d))) {                  // all inputs settled -> ready
        c.value = c.formula(c.deps.map((d) => s.cells.get(d).value));
        c.dirty = false; remaining.delete(n); s.lastRecomputes++; progress = true;
      }
    }
  }
  if (remaining.size) throw new Error('cycle detected in propagation: ' + [...remaining].join(', '));
}
