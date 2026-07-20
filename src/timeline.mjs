// timeline.mjs: event sourcing / deterministic replay (PRIMER: "returnable time").
// A timeline is an initial state + ordered deltas + a pure apply(state, delta). It never erases a
// delta, so any past frame is reconstructible by folding the first k deltas onto the initial state.
// Forward and rewind always agree because reconstruction is a pure function of the kept record. This
// is the glass recomposing on rewind and the film replaying 1925: and it is the same machine as the
// FastTrack netcode resync (seed + ordered deltas). The return is only ever as complete as the record.
export function makeTimeline(initial, deltas, apply) { return { initial, deltas, apply }; }

// The state after the first k deltas. k=0 is the initial "whole glass"; k=deltas.length is the end.
export function reconstruct(tl, k) {
  let s = structuredClone(tl.initial);
  for (let i = 0; i < k; i++) s = tl.apply(s, tl.deltas[i]);
  return s;
}
