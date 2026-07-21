// test_rewind.mjs: the returnable-time receipt (PRIMER: event sourcing / deterministic replay).
// A kept record replays to ANY past frame, forward and rewind agree, and rewinding to the start
// recomposes the initial state exactly (the glass un-shatters; film replays 1925). Same machine as
// a lockstep netcode resync. Run: node dimensional-analyzer/test/test_rewind.mjs
import { makeTimeline, reconstruct } from '../src/timeline.mjs';
import { shaSeq } from '../src/seedbloom.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };

console.log('\n== returnable time: a kept record replays to ANY past frame, forward and rewind agree ==');
const initial = { a: 0, b: 0, log: [] };
const apply = (s, d) => ({ a: s.a + (d.a || 0), b: s.b + (d.b || 0), log: [...s.log, d.tag] });
const deltas = [{ a: 1, tag: 'x' }, { b: 2, tag: 'y' }, { a: 3, tag: 'z' }, { b: -1, tag: 'w' }, { a: 1, tag: 'v' }];
const tl = makeTimeline(initial, deltas, apply);

// Forward: reconstruct every frame 0..N.
const frames = [];
for (let k = 0; k <= deltas.length; k++) frames.push(reconstruct(tl, k));

// Scrub consistency: frame k+1 === apply(frame k, delta k): the forward step and the rewind step meet.
for (let k = 0; k < deltas.length; k++) {
  ok(shaSeq(frames[k + 1]) === shaSeq(apply(frames[k], deltas[k])), `frame ${k}->${k + 1}: the forward step is consistent with the reconstructed frame (scrub agrees)`);
}

// Rewind: from the end, reconstructing any earlier frame returns the exact past state.
let rewindOk = true;
for (let k = deltas.length; k >= 0; k--) if (shaSeq(reconstruct(tl, k)) !== shaSeq(frames[k])) rewindOk = false;
ok(rewindOk, 'rewind to every frame reconstructs the exact past state, byte-identical (returnable time)');

// The glass recomposes: rewind all the way to frame 0 === the initial whole state.
ok(shaSeq(reconstruct(tl, 0)) === shaSeq(initial), 'rewind to frame 0 recomposes the initial state exactly (the glass un-shatters)');

// Determinism: replaying the same record reproduces the final frame identically (the film is stable).
ok(shaSeq(reconstruct(makeTimeline(initial, deltas, apply), deltas.length)) === shaSeq(frames[deltas.length]),
  'replaying the same record reproduces the final frame identically (deterministic replay)');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
