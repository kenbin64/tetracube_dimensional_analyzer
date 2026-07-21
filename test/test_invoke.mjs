// Receipts for the dimensional core. The load-bearing one is COST: answering a question about a
// spark plug must not cost the whole car, and must not grow when the space grows.
import {
  createSpace, ingest, invoke, collapse, expand, countAt, relate, resetMeter,
  setManifold, verifyManifold, consult,
} from '../src/invoke.mjs';
import { encapsulate, decapsulate } from '../src/relational.mjs';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };

// A car is a dimension with all its parts. Build a few, of two types.
// The spark plug is not a leaf. It is itself a dimension with parts: what it is made to do, and how
// it behaves. Those are invoked when needed, and not before.
const car = (make, model, plugBrand) => ({
  make, model,
  engine: {
    block: 'iron',
    cylinder: {
      bore: 86,
      sparkplug: {
        brand: plugBrand, gap: 0.044,
        spec: { heatRange: 6, thread: 'M14x1.25', material: 'iridium' },
        operation: { firesAt: 'compression-top', dwellMs: 2.4 },
      },
    },
  },
  wheels: [{ position: 'fl' }, { position: 'fr' }, { position: 'rl' }, { position: 'rr' }],
});

const space = createSpace();
ingest(space, [
  car('Toyota', 'Corolla', 'NGK'),
  car('Toyota', 'Camry', 'Denso'),
  car('Honda', 'Civic', 'NGK'),
], { type: 'car' });

console.log('\n== a dimension is a type: its name is the address ==');
const plugs = invoke(space, 'sparkplug');
ok(plugs.length === 3, `invoking "sparkplug" resolves every spark plug in the space (${plugs.length})`);
ok(plugs.every((p) => p.coord.gap === 0.044), 'each resolved point carries its own coordinates');
ok(invoke(space, 'carburetor') === null, 'a dimension that is not there does not resolve, and is not invented');

console.log('\n== collapse is encapsulation: the whole counts as ONE above ==');
const cars = invoke(space, 'car');
const c = collapse(cars[0]);
ok(c.count === 1, 'a car collapses to exactly 1, not 0 (erasure) and not a fraction (partial)');
ok(cars[0].interior.length > 0, 'collapsing did not touch the interior: the parts are all still there');
ok(countAt(space, 'car') === 3, 'counting is level relative: three cars is 3, not 3 x parts-per-car');
ok(countAt(space, 'wheels') === 12, 'one level down, the same space counts 12 wheels');

console.log('\n== expand goes only as deep as the purpose ==');
const oneDeep = expand(space, cars[0], 1);
ok(oneDeep.length === 5 && oneDeep.every((x) => x.interior === undefined),
  'depth 1 answers "what is this made of" and stops there');
const full = expand(space, cars[0], Infinity);
const deepest = full.find((x) => x.name === 'engine').interior[0].interior[0];
ok(deepest.name === 'sparkplug', 'depth Infinity DOES inventory the entire car, when that is the purpose');

console.log('\n== cost tracks the ask, not the size of the structure ==');
resetMeter(space);
invoke(space, 'sparkplug');
const plugCost = space.touches;
resetMeter(space);
expand(space, cars[0], Infinity);
const inventoryCost = space.touches;
ok(plugCost < inventoryCost,
  `asking for a spark plug costs less than inventorying one car (${plugCost} vs ${inventoryCost})`);

// The precise claim: cost follows the size of the ANSWER and is blind to the size of the space.
// So hold the answer fixed (one rare part, in one car) and grow the space around it.
const rare = () => ({ make: 'Tucker', model: '48', torqueometer: { serial: 'T-1' } });

const small = createSpace();
ingest(small, [rare(), car('Toyota', 'Corolla', 'NGK')]);
const large = createSpace();
ingest(large, [rare(), ...Array.from({ length: 60 }, (_, i) => car('Make' + i, 'Model' + i, 'NGK'))]);

resetMeter(small); invoke(small, 'torqueometer'); const smallCost = small.touches;
resetMeter(large); invoke(large, 'torqueometer'); const largeCost = large.touches;
ok(smallCost === largeCost && smallCost === 1,
  `the same one-point answer costs the same in a ${small.points.size}-point space and a `
  + `${large.points.size}-point space (${smallCost} vs ${largeCost}): cost is blind to the structure`);

// And when the answer itself grows, paying more is correct, not a failure.
resetMeter(large); invoke(large, 'engine'); const manyCost = large.touches;
ok(manyCost === countAt(large, 'engine'),
  `asking for every engine costs exactly the number of engines (${manyCost}): cost tracks the ask`);

console.log('\n== the ladder keeps going: a part is itself a dimension with parts ==');
// Wanting the spark plug is not wanting its specs and its operation. Those are one more invocation,
// made only when needed. So invoking the plug must cost the plugs and nothing beneath them.
resetMeter(space);
const gotPlugs = invoke(space, 'sparkplug');
ok(space.touches === gotPlugs.length,
  `invoking the spark plug costs the spark plugs alone (${space.touches}), not their specs or operation`);

const plugCollapse = collapse(gotPlugs[0]);
ok(plugCollapse.count === 1 && gotPlugs[0].interior.length === 2,
  'the plug counts as ONE from the cylinder above, while still holding its spec and operation');

resetMeter(space);
const spec = invoke(space, 'spec');
ok(spec && spec.length === 3 && space.touches === 3,
  'specs are invoked directly when wanted, without passing through car, engine, cylinder or plug');
ok(spec[0].coord.material === 'iridium', 'and the invoked point carries its own coordinates');

const op = relate(space, 'operation', 'sparkplug');
ok(op.grounded && op.links.length === 3,
  'operation relates back up to the spark plug on demand, derived not stored');

console.log('\n== a relationship is made at the moment of asking, or not at all ==');
const r1 = relate(space, 'sparkplug', 'car');
ok(r1.grounded && r1.links.length === 3, 'spark plug relates to car, derived from containment on demand');
const r2 = relate(space, 'sparkplug', 'wheels');
ok(!r2.grounded, 'an ungrounded pairing does not resolve: ' + r2.why);
const r3 = relate(space, 'sparkplug', 'carburetor');
ok(!r3.grounded, 'relating to a dimension that does not exist fails honestly: ' + r3.why);

console.log('\n== hold the manifold, derive the grain ==');
// We do not store every spark plug variant. We store the spark plug's manifold. Gap opens as the
// heat range climbs, on a fixed relation; the field it covers is far larger than anything we hold.
const GAP = (hr) => Math.round((0.032 + 0.002 * hr) * 1000) / 1000;
setManifold(space, 'sparkplug', {
  describes: 'gap as a function of heat range',
  derive: ({ heatRange }) => (heatRange >= 2 && heatRange <= 12 ? { gap: GAP(heatRange) } : null),
  samples: [{ at: { heatRange: 6 }, is: { gap: 0.044 } }],   // the grain we actually observed
});

const v = verifyManifold(space, 'sparkplug');
ok(v.ok && v.checked === 1, 'the manifold first reproduces the sample we actually hold');

resetMeter(space);
const grain = consult(space, 'sparkplug', { heatRange: 9 });
ok(grain.grounded && grain.value.gap === 0.050,
  `grain we never stored is derived on consult: heat range 9 gives gap ${grain.value?.gap}`);
ok(space.touches === 1,
  `consulting the manifold costs ${space.touches}, whatever the size of the field it describes`);

const offEdge = consult(space, 'sparkplug', { heatRange: 40 });
ok(!offEdge.grounded, 'past the edge of the manifold it stops rather than guessing: ' + offEdge.why);

// A manifold that cannot reproduce what we already know does not get to answer anything.
const bad = createSpace();
ingest(bad, [car('Toyota', 'Corolla', 'NGK')]);
setManifold(bad, 'sparkplug', {
  derive: () => ({ gap: 0.999 }),
  samples: [{ at: { heatRange: 6 }, is: { gap: 0.044 } }],
});
const refused = consult(bad, 'sparkplug', { heatRange: 6 });
ok(!refused.grounded, 'a manifold that fails its own samples is refused, not trusted: ' + refused.why);

ok(consult(space, 'wheels', { position: 'fl' }).grounded === false,
  'a dimension with no manifold says so rather than fabricating one');

console.log('\n== the interior is never lost: encapsulate round-trips ==');
// encapsulate sorts keys, so compare canonically: same structure, key order is not information.
const deep = (v) => (v && typeof v === 'object' && !Array.isArray(v))
  ? Object.keys(v).sort().reduce((o, k) => (o[k] = deep(v[k]), o), {})
  : (Array.isArray(v) ? v.map(deep) : v);
const original = car('Toyota', 'Corolla', 'NGK');
ok(JSON.stringify(deep(decapsulate(encapsulate(original)))) === JSON.stringify(deep(original)),
  'encapsulate then decapsulate returns the identical structure');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
