// test_propagate.mjs: step 6 receipt: propagation / recalc (the Mrs Kravitz effect).
// A change ripples only along the local dependency edges: coupled cells recompute (in order),
// independent cells are untouched, and the sheet stays consistent. Parallelism equals dimensional
// independence; couplings force sequence; cycles are refused. Run: node dimensional-analyzer/test/test_propagate.mjs
import { makeSheet, setInput, setFormula, get } from '../src/propagate.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };

// a, b, x, y are inputs. c = a+b, d = c*2 (a coupled chain). e = x+y (independent of a,b).
const s = makeSheet();
setInput(s, 'a', 3);
setInput(s, 'b', 4);
setInput(s, 'x', 10);
setInput(s, 'y', 20);
setFormula(s, 'c', ['a', 'b'], ([a, b]) => a + b);
setFormula(s, 'd', ['c'], ([c]) => c * 2);
setFormula(s, 'e', ['x', 'y'], ([x, y]) => x + y);

console.log('\n== the sheet derives its formula cells from the generators ==');
ok(get(s, 'c') === 7, 'c = a + b = 7');
ok(get(s, 'd') === 14, 'd = c * 2 = 14 (derived through the coupling c)');
ok(get(s, 'e') === 30, 'e = x + y = 30 (an independent surface)');

console.log('\n== change an input: only the local neighborhood recomputes (Mrs Kravitz) ==');
setInput(s, 'a', 5);
ok(get(s, 'c') === 9 && get(s, 'd') === 18, 'changing a re-derived c=9 then d=18 (propagated in coupling order, d used the NEW c)');
ok(get(s, 'e') === 30, 'e is untouched: an unrelated cell does not recompute (locality)');
ok(s.lastRecomputes === 2, `only the 2 affected cells recomputed, not the whole sheet (incremental: ${s.lastRecomputes})`);

console.log('\n== an unrelated change touches only its own neighborhood ==');
setInput(s, 'x', 100);
ok(get(s, 'e') === 120 && get(s, 'c') === 9, 'changing x re-derived e=120 and left c=9 alone');
ok(s.lastRecomputes === 1, `only e recomputed on the x change (${s.lastRecomputes}): parallelism equals independence`);

console.log('\n== couplings force order; cycles are refused ==');
const s2 = makeSheet();
setInput(s2, 'p', 1);
setFormula(s2, 'q', ['p', 'r'], ([p, r]) => p + (r || 0));
let cyc = false;
try { setFormula(s2, 'r', ['q'], ([q]) => q + 1); } catch (e) { cyc = /cycle/.test(e.message); }
ok(cyc, 'a dependency cycle is detected and refused (no infinite propagation)');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
