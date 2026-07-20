// seedbloom.mjs: the seed/bloom retrieval layer (PRIMER Section 6).
// seed = gather/collapse to a compact generator (rule + residual). bloom = expand back to the parts.
// bloom(seed(x)) === x ALWAYS, because the residual carries any deviation from the rule (Guard 4:
// lossless encapsulation, never a lossy collapse). The residual's size measures how much structure
// the rule actually captured: all-zero residual = pure structure (max compression), full residual =
// no structure (degrade to raw, exactly as GEP returns 1.0x on random, Guard 5).
import crypto from 'crypto';

export const shaSeq = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');

// The maintained rule registry (PRIMER: "maintain the rule to rebuild"). Rules are versioned; a seed
// stamps (rule, version) and bloom resolves the rule from the registry by that stamp, so a seed made
// today still blooms after the live code moves on. Losing or corrupting the rule is the burned log:
// the ash (residual) alone cannot un-burn without it.
export const registry = new Map();          // 'name@version' -> rule
export function register(rule) { registry.set(`${rule.name}@${rule.version}`, rule); return rule; }
export function resolveRule(name, version) {
  const r = registry.get(`${name}@${version}`);
  if (!r) throw new Error(`rule not in registry: ${name}@${version}: cannot bloom without the maintained rule`);
  return r;
}

// A linear-recurrence rule predicts the next term from the previous `order` terms.
export const fibRule = register({
  name: 'sum-last-2',
  version: 1,
  order: 2,
  predict: (prev) => prev[prev.length - 1] + prev[prev.length - 2],
});

// SEED a numeric sequence: keep the base terms + the rule name + the residual (each term's deviation
// from the rule applied to the TRUE prior terms). Fibonacci under sum-last-2 yields an all-zero
// residual, so the whole sequence collapses to two base values and a rule.
export function seed(seq, rule) {
  const base = seq.slice(0, rule.order);
  const residual = [];
  for (let i = rule.order; i < seq.length; i++) {
    residual.push(seq[i] - rule.predict(seq.slice(0, i)));
  }
  return { t: 'seq', base, rule: rule.name, version: rule.version, order: rule.order, length: seq.length, residual };
}

// BLOOM a seed back to the exact sequence: resolve the rule from the registry by its (name, version)
// stamp, apply it to the reconstructed prior terms plus the residual, and every term returns. Lossless
// by construction, and durable because the rule is looked up, not assumed present in live code.
export function bloom(s) {
  const rule = resolveRule(s.rule, s.version);
  const out = s.base.slice();
  for (let i = s.order; i < s.length; i++) {
    out.push(rule.predict(out.slice(0, i)) + s.residual[i - s.order]);
  }
  return out;
}

// How much of the sequence the rule captured: fraction of the residual that is zero.
// 1.0 = fully generated (pure structure), 0.0 = the rule is wrong for this data (raw).
export function structureScore(s) {
  if (s.residual.length === 0) return 1;
  return s.residual.filter((r) => r === 0).length / s.residual.length;
}

// -- the rule repertoire + search (PRIMER: the analyzer searches for the FITTING generator) --
// More rules = more patterns the analyzer can recognize. Each predicts the next term from the prior
// `order` terms. Fibonacci is sum-last-2; constant repeats; arithmetic extrapolates the last step.
export const constRule = register({ name: 'const', version: 1, order: 1, predict: (p) => p[p.length - 1] });
export const arithRule = register({ name: 'arith', version: 1, order: 2, predict: (p) => 2 * p[p.length - 1] - p[p.length - 2] });
// Finite-difference extrapolators: a degree-d polynomial has a constant d-th difference, so the next
// term is an exact integer combination of the last d+1 terms (binomial coefficients). arith is d=1;
// these add d=2 and d=3, so squares, cubes, and any low-degree polynomial run collapse to their base
// terms with an all-zero residual. Integer-exact, so the lossless guarantee is untouched.
export const quadRule = register({ name: 'quad', version: 1, order: 3, predict: (p) => 3 * p[p.length - 1] - 3 * p[p.length - 2] + p[p.length - 3] });
export const cubicRule = register({ name: 'cubic', version: 1, order: 4, predict: (p) => 4 * p[p.length - 1] - 6 * p[p.length - 2] + 4 * p[p.length - 3] - p[p.length - 4] });
export const repertoire = [constRule, arithRule, fibRule, quadRule, cubicRule];

// Seed size in "cells": the base terms + the NONZERO residual entries (a sparse residual) + 1 rule id.
// A well-fit rule leaves few nonzero residuals, so its seed is small; a wrong rule stores everything.
export function seedSize(s) {
  return s.base.length + s.residual.filter((r) => r !== 0).length + 1;
}

// SEED with the best-fitting rule from the repertoire, gated by MDL: keep the smallest seed, but if
// no rule beats storing the data raw (seedSize < length) fall back to `raw` and report 1.0x. This is
// the honest floor from Ken's "no collapse to zero": we never claim a win that is not there, we never
// go below the generator, and the reconstruction stays lossless either way.
export function seedBest(seq) {
  let best = null;
  for (const rule of repertoire) {
    if (seq.length < rule.order) continue;
    const s = seed(seq, rule);
    const size = seedSize(s);
    if (!best || size < best.size) best = { seed: s, size };
  }
  const rawSize = Math.max(seq.length, 1);
  if (!best || best.size >= rawSize) {
    const s = best ? best.seed : (seq.length ? seed(seq, constRule) : { t: 'seq', base: [], rule: 'const', version: 1, order: 0, length: 0, residual: [] });
    return { rule: 'raw', ratio: 1, score: 0, size: rawSize, seed: s };
  }
  return { rule: best.seed.rule, ratio: rawSize / best.size, score: structureScore(best.seed), size: best.size, seed: best.seed };
}

// -- skin-and-recurse (PRIMER: encapsulate to 1 in the next dimension, then start again a level up) --
// A whole rung (a list of lower points) encapsulates into ONE point; bloomLevel unwraps it. Stacking
// these is the ladder: the encapsulated point is the unit the next order counts from, recursively.
export function skinLevel(points) { return { t: 'level', items: points }; }
export function bloomLevel(p) { return p.items; }
