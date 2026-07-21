// invoke.mjs: the dimensional core, built on Ken's model.
//
// The rules this implements, in his words:
//
//   * A dimension is a TYPE, not an instance. Its name is a point that symbolically holds
//     everything that type could ever be. We do not spend any of that until something asks.
//   * COLLAPSE IS ENCAPSULATION, not compression. A car is a dimension with all its parts, but we
//     only call it a car and count that as a single point. Nothing is encoded, nothing is decoded,
//     nothing is lost, because the interior is never operated on.
//   * A whole below counts as ONE above. Not zero, which is erasure, and not a fraction, which is
//     partial. 1 is what bridges the dimensional divide, the way a unit basis vector is parallel to
//     its own axis and perpendicular to every other one.
//   * We do not traverse. If we want the spark plug we invoke the spark plug. We relate it to a car
//     type or a particular car only if we need that, and we never inventory the whole car to do it,
//     UNLESS inventorying the car is the actual purpose.
//   * There are no prior relationships. A relationship is created on demand, from the coordinates
//     actually present. If there is no ground for it in the data, it does not resolve, and we say so
//     rather than manufacture a plausible link.
//
// The measurable consequence, which the receipts assert: the cost of an answer is proportional to
// what was ASKED, not to the size of the structure. That is what makes an unbounded structure
// workable, since it is never enumerated.

// ── the space ────────────────────────────────────────────────────────────────
// A point is a name plus the interior it stands for. `touches` is not decoration: it is the meter
// that proves cost tracks the ask, so every read of a point goes through touch().

export function createSpace() {
  return { points: new Map(), touches: 0 };
}

function touch(space, point) {
  space.touches += 1;
  return point;
}

export function resetMeter(space) {
  space.touches = 0;
  return space;
}

// Ingest reads what it is handed, once, and indexes every point by name so that a later invoke
// costs one lookup instead of a walk. Reading the data you were given is the one unavoidable cost;
// it is not the same as enumerating the structure on every question.
export function ingest(space, records, { type = 'record' } = {}) {
  for (const record of records) place(space, record, type, null);
  return space;
}

function place(space, value, name, parentId) {
  const id = `${name}#${space.points.size}`;
  const point = {
    id,
    name,                       // the TYPE. many points share it; it is the address.
    parent: parentId,
    interior: [],               // ids of the points this one encapsulates
    coord: {},                  // the scalar axes carried directly by this point
  };
  space.points.set(id, point);

  let index = space.byName;
  if (!index) { index = space.byName = new Map(); }
  if (!index.has(name)) index.set(name, []);
  index.get(name).push(id);

  for (const key of Object.keys(value).sort()) {
    const v = value[key];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      point.interior.push(place(space, v, key, id));
    } else if (Array.isArray(v)) {
      for (const item of v) {
        if (item && typeof item === 'object') point.interior.push(place(space, item, key, id));
      }
    } else {
      point.coord[key] = v;
    }
  }
  return id;
}

// ── invoke: reach a point by name, with no traversal ─────────────────────────
// This is the spark plug case. The name IS the address, so the cost is the number of points that
// carry that name, never the size of the car and never the size of the space.

export function invoke(space, name) {
  const ids = space.byName?.get(name);
  if (!ids || !ids.length) return null;          // no such dimension: say so, do not invent one
  return ids.map((id) => touch(space, space.points.get(id)));
}

// ── collapse and expand: the level shift ─────────────────────────────────────
// Collapse does not operate on the interior at all. It states that this whole is one point at the
// level above. That is why it cannot lose anything: it does not touch what it encapsulates.

export function collapse(point) {
  return { point: point.id, name: point.name, count: 1 };   // a whole below is ONE above
}

// Expand goes only as deep as the purpose requires. depth 1 is "what is this made of", and
// Infinity is the inventory-the-entire-car case, which is legitimate when that is the actual
// purpose. Either way the cost is what was asked for, nothing more.
export function expand(space, point, depth = 1) {
  if (depth <= 0) return [];
  return point.interior.map((id) => {
    const child = touch(space, space.points.get(id));
    return {
      id: child.id,
      name: child.name,
      coord: child.coord,
      interior: depth > 1 ? expand(space, child, depth - 1) : undefined,
    };
  });
}

// Counting is level relative. A fleet of ten cars is ten, not ten times the parts per car, because
// each car below counts as one above.
export function countAt(space, name) {
  return (space.byName?.get(name) || []).length;
}

// ── manifolds: hold the generator, derive the grain ──────────────────────────
// A dimension does not have to carry every aspect of itself enumerated. It can hold the MANIFOLD
// instead, and when we need grainy detail on a spark plug we consult the spark plug's manifold and
// it gives us the answer. The manifold is attached to the NAME, the type, not to any one instance,
// because it describes what that kind of thing IS.
//
// The fence that keeps this derivation and not invention: a manifold must first reproduce the
// samples we actually hold. If it cannot, it does not get to answer. Where there is no seed, mark
// the edge and stop.

export function setManifold(space, name, { derive, samples = [], describes = '' }) {
  if (!space.manifolds) space.manifolds = new Map();
  space.manifolds.set(name, { derive, samples, describes, verified: null });
  return space;
}

// Check the manifold against every sample it claims to cover. Runs once, then caches the verdict,
// so the fence costs nothing on later consults.
export function verifyManifold(space, name) {
  const m = space.manifolds?.get(name);
  if (!m) return { ok: false, why: `no manifold for ${name}` };
  if (m.verified) return m.verified;

  // Agreement is judged only on the aspects we actually observed. A manifold is allowed to reach
  // further than the grain we hold, which is exactly what makes potential answerable: nobody ever
  // recorded the spark potential, the manifold yields it. What it may NOT do is disagree about
  // something we did observe.
  const misses = [];
  for (const s of m.samples) {
    let got;
    try { got = m.derive(s.at); } catch (e) { got = { error: String(e) }; }
    if (!got || Object.keys(s.is).some((k) => got[k] !== s.is[k])) {
      misses.push({ at: s.at, expected: s.is, got });
    }
  }
  m.verified = misses.length
    ? { ok: false, why: `manifold does not reproduce ${misses.length}/${m.samples.length} known samples`, misses }
    : { ok: true, why: '', checked: m.samples.length };
  return m.verified;
}

// ── holding data is the last resort ──────────────────────────────────────────
// A great deal can be derived from the manifold, so no prior input is needed to answer. That makes
// stored data the RESIDUAL: we hold only what the manifold cannot give us. Before anything is kept,
// it has to fail the derivability test, and most of it does not.

const atKey = (at) => JSON.stringify(Object.keys(at).sort().reduce((o, k) => (o[k] = at[k], o), {}));

export function derivable(space, name, at, value) {
  const r = consult(space, name, at);
  if (!r.grounded) return { derivable: false, why: r.why };
  const disagrees = Object.keys(value).filter((k) => r.value[k] !== value[k]);
  if (disagrees.length) {
    return { derivable: false, why: `manifold reaches it but disagrees on ${disagrees.join(', ')}` };
  }
  return { derivable: true, why: 'the manifold already gives this' };
}

// Offer a fact to the space. It is kept only if it cannot be derived. This is the last resort, and
// what gets kept is exactly the residual.
export function hold(space, name, at, value) {
  const d = derivable(space, name, at, value);
  if (d.derivable) return { held: false, why: 'not held: ' + d.why };
  if (!space.held) space.held = new Map();
  const key = `${name}|${atKey(at)}`;
  space.held.set(key, { name, at, value });
  return { held: true, why: 'held as residual: ' + d.why };
}

export function heldCount(space) { return space.held ? space.held.size : 0; }

// Consult the manifold for grain we never stored. One touch, whatever the size of the field it
// describes: that is the point of holding the generator rather than the field.
export function consult(space, name, at) {
  // What we actually observed outranks what we can derive. A residual is kept precisely because the
  // manifold could not produce it, so it answers first.
  const heldHit = space.held?.get(`${name}|${atKey(at)}`);
  if (heldHit) {
    space.touches += 1;
    return { grounded: true, why: '', value: heldHit.value, derived: false, from: `${name} held residual` };
  }

  const m = space.manifolds?.get(name);
  if (!m) return { grounded: false, why: `${name} has no manifold to consult`, value: null };

  const v = verifyManifold(space, name);
  if (!v.ok) return { grounded: false, why: v.why, value: null };

  space.touches += 1;
  let value;
  try { value = m.derive(at); } catch (e) { return { grounded: false, why: String(e), value: null }; }
  if (value === undefined || value === null) {
    return { grounded: false, why: `${name}'s manifold does not reach ${JSON.stringify(at)}`, value: null };
  }
  return { grounded: true, why: '', value, derived: true, from: `${name} manifold`, checked: v.checked };
}

// ── the lifecycle: acquire once, induce, then the manifold carries it ────────
// At one time the system needs ALL the info of the spark plug, from wherever it can get it. That
// full gather is expensive and that is fine, because at that moment it IS the purpose. Once it is
// had, a manifold can be induced from it, and from then on the individual aspects are encoded by
// the manifold, for as long as that manifold is maintained.
//
// Maintenance is not decoration either. A manifold's authority lasts exactly as long as it keeps
// reproducing what we know. New grain that contradicts it invalidates it, and an invalidated
// manifold stops answering instead of quietly being wrong.

// ACQUIRE: gather every aspect of every point of this type. `by` names the axes that identify a
// case, `of` names the aspects we want to be able to answer about later.
export function acquire(space, name, { by, of }) {
  const ids = space.byName?.get(name) || [];
  const samples = [];
  for (const id of ids) {
    const p = touch(space, space.points.get(id));
    const at = {}, is = {};
    let complete = true;
    for (const k of by) {
      if (!(k in p.coord)) { complete = false; break; }
      at[k] = p.coord[k];
    }
    if (!complete) continue;
    for (const k of of) if (k in p.coord) is[k] = p.coord[k];
    if (Object.keys(is).length) samples.push({ at, is, id });
  }
  return samples;
}

// INDUCE: find a generator that reproduces EVERY acquired sample, not most of them. A candidate
// that fits some and misses others is rejected outright: a manifold that is right about the grain
// we happen to check and wrong elsewhere is worse than no manifold at all.
export function induce(space, name, { by, of, candidates }) {
  const samples = acquire(space, name, { by, of });
  if (!samples.length) {
    return { induced: false, why: `nothing acquired for ${name}: no grain to induce from`, samples: 0 };
  }
  for (const cand of candidates) {
    const misses = samples.filter((s) => {
      let got;
      try { got = cand.derive(s.at); } catch { return true; }
      return !got || of.some((k) => k in s.is && got[k] !== s.is[k]);
    });
    if (!misses.length) {
      setManifold(space, name, { derive: cand.derive, samples, describes: cand.describes || '' });
      verifyManifold(space, name);
      return { induced: true, describes: cand.describes, covers: samples.length, why: '' };
    }
  }
  return {
    induced: false,
    why: `no candidate reproduces all ${samples.length} acquired aspects of ${name}`,
    samples: samples.length,
  };
}

// MAINTAIN: hold the manifold against new grain. Agreement extends its evidence. Contradiction
// invalidates it, and it stops answering until it is re-induced.
export function maintain(space, name, observations) {
  const m = space.manifolds?.get(name);
  if (!m) return { held: false, why: `no manifold for ${name}` };

  const contradictions = [];
  for (const o of observations) {
    let got;
    try { got = m.derive(o.at); } catch (e) { got = null; }
    if (!got || Object.keys(o.is).some((k) => got[k] !== o.is[k])) {
      contradictions.push({ at: o.at, expected: o.is, got });
    }
  }
  if (contradictions.length) {
    m.verified = {
      ok: false,
      why: `manifold contradicted by ${contradictions.length} new observation(s); it no longer holds`,
      contradictions,
    };
    return { held: false, why: m.verified.why, contradictions };
  }
  m.samples = m.samples.concat(observations);          // agreement widens the evidence it stands on
  m.verified = { ok: true, why: '', checked: m.samples.length };
  return { held: true, why: '', checked: m.samples.length };
}

// Once induced and verified, the enumerated aspects no longer have to be carried: the manifold
// encodes them. This drops them and leaves the manifold answering in their place.
export function shedEnumeration(space, name, aspects) {
  const v = verifyManifold(space, name);
  if (!v.ok) return { shed: false, why: `refusing to shed: ${v.why}` };
  let dropped = 0;
  for (const id of space.byName?.get(name) || []) {
    const p = space.points.get(id);
    for (const k of aspects) if (k in p.coord) { delete p.coord[k]; dropped++; }
  }
  return { shed: true, dropped, why: '' };
}

// ── relate: the relationship is made at the moment of asking ─────────────────
// Two points are related when one lies in the other's containment line. We walk UP from each, which
// costs the depth of the point, not the breadth of the structure. Nothing is precomputed, so
// nothing has to be maintained, and an ungrounded pairing simply does not resolve.

// ── compose: no one thing holds all the answers ──────────────────────────────
// Things are made of parts, and each part has its own attributes. So most real questions are not
// answerable from any single dimension: they have to be put together across several, at the moment
// of asking. That is why the relationship has to be MADE rather than looked up.
//
// Every leg must be grounded. If one dimension cannot answer its part, the composed answer does not
// resolve, and we name the leg that failed instead of returning a partial that reads as whole.

export function ask(space, { need, combine, question = '' }) {
  const legs = [], missing = [];
  for (const { dimension, at, as } of need) {
    const r = consult(space, dimension, at);
    if (!r.grounded) { missing.push({ dimension, why: r.why }); continue; }
    legs.push({ as: as || dimension, dimension, value: r.value });
  }
  if (missing.length) {
    return {
      grounded: false,
      question,
      why: `cannot answer: ${missing.map((m) => `${m.dimension} (${m.why})`).join('; ')}`,
      missing,
      value: null,
    };
  }
  const parts = {};
  for (const l of legs) parts[l.as] = l.value;

  let value;
  try { value = combine(parts); } catch (e) {
    return { grounded: false, question, why: String(e), value: null, from: legs.map((l) => l.dimension) };
  }
  if (value === undefined || value === null) {
    return {
      grounded: false, question, value: null, from: legs.map((l) => l.dimension),
      why: 'the parts are grounded but they do not combine into an answer here',
    };
  }
  return { grounded: true, question, value, from: legs.map((l) => l.dimension), parts };
}

function lineage(space, point) {
  const line = [];
  let cur = point;
  while (cur) {
    line.push(cur.id);
    cur = cur.parent ? touch(space, space.points.get(cur.parent)) : null;
  }
  return line;
}

export function relate(space, nameA, nameB) {
  const as = invoke(space, nameA);
  const bs = invoke(space, nameB);
  if (!as || !bs) return { grounded: false, why: `no such dimension: ${as ? nameB : nameA}`, links: [] };

  const links = [];
  for (const a of as) {
    const line = new Set(lineage(space, a));
    for (const b of bs) {
      if (line.has(b.id)) { links.push({ from: a.id, to: b.id, via: 'contains' }); continue; }
      const bLine = new Set(lineage(space, b));
      if (bLine.has(a.id)) links.push({ from: b.id, to: a.id, via: 'contains' });
    }
  }
  if (!links.length) {
    return { grounded: false, why: `nothing in the data links ${nameA} to ${nameB}`, links: [] };
  }
  return { grounded: true, why: '', links };
}
