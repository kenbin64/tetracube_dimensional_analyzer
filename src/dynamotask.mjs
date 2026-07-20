// dynamotask.mjs — a deterministic linter for "stump-tasks" (tasks written to defeat an AI), built on
// top of analyzeTask. No model in the loop: an AI reviewer gets stymied by the very tasks this reads,
// so you need a fixed structural read plus a fixed set of known-failure checks. It reports; you decide.
//
// It encodes failure modes learned the hard way building such tasks:
//  * METHOD (how-to-solve) disclosed  -> naming the recovery procedure hands over the answer  [FAIL]
//  * STRUCTURE disclosed              -> naming what the hidden rule IS leaks it for a hidden-rule task,
//                                        but is fine for an overt-math/crypto spec                [WARN]
//  * RECOVERY / secret framing        -> "recover the secret" invites exact recovery, weakens the trap [WARN]
//  * LAZY AMBIGUITY                   -> undefinable terms make a task unfair (top kickback reason) [FAIL]
//  * EXACT / HELD-OUT grading, ABSOLUTE PATHS, TOKEN BUDGET, HARDNESS PROFILE                       [info]
import { analyzeTask } from './taskanalyzer.mjs';

const METHOD_HOWTO = [
  'null space', 'nullspace', 'null-space', 'monomial matrix', 'gaussian elimination',
  'matrix exponentiation', 'transfer matrix', 'aho-corasick', 'rpni', 'state-merging', 'berlekamp',
  'chinese remainder', 'least squares', 'discrete log', 'degree search', 'interpolat',
  'recover the polynomial', 'recover the map by',
];
const METHOD_STRUCTURE = [
  'polynomial', 'monomial', 'modulo', 'mod', 'modular', 'prime field', 'finite field', 'gf(',
  'congruence', 'congruent', 'coefficient', 'the modulus', 'the degree', 'the prime', 'eigen',
  'linear recurrence', 'toral', 'lattice map', 'modular arithmetic',
];
const RECOVERY_FRAMING = [
  'secret', 'cryptanalyst', 'keying scheme', 'reverse-engineer', 'reverse engineer', 'crack the',
  'decode the', 'cipher', 'the hidden scheme', 'undocumented scheme', 'break the', 'the key that',
];
const LAZY_VAGUE = [
  'etc', 'and so on', 'appropriately', 'reasonably', 'reasonable', 'properly', 'as needed',
  'as necessary', 'as appropriate', 'somehow', 'handle edge cases', 'robust', 'user-friendly',
  'intuitive', 'elegant', 'scalable', 'maintainable', 'todo', 'tbd', 'figure out', 'and such',
  'whatever', 'nicely', 'good enough', 'make sense', 'or something', 'the right format', 'the right way',
];

function has(hay, needle) {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (/^[a-z0-9 -]+$/.test(needle)) return new RegExp('\\b' + esc + '\\b', 'i').test(hay);
  return hay.indexOf(needle) !== -1;
}
const hits = (hay, list) => list.filter((t) => has(hay, t));

// Analyze a stump-task description. Returns structured signals + a verdict; never rewrites the text.
export function lintDynamoTask(text) {
  const src = String(text == null ? '' : text);
  const low = src.toLowerCase();
  const a = analyzeTask(src);
  const s = a.scores;
  const tokens = Math.ceil(src.length / 4);
  const fails = [], warns = [], notes = [];

  const howto = hits(low, METHOD_HOWTO);
  if (howto.length) fails.push({ code: 'method-howto', terms: howto, msg: 'names the recovery procedure (hands over the solution)' });

  const structure = hits(low, METHOD_STRUCTURE);
  if (structure.length) warns.push({ code: 'structure-disclosed', terms: structure, msg: 'reveals the rule structure (a leak for a HIDDEN-rule task; fine for overt math/crypto)' });

  const frames = hits(low, RECOVERY_FRAMING);
  if (frames.length) warns.push({ code: 'recovery-framing', terms: frames, msg: 'signals reverse-a-secret; prefer neutral "reproduce / predict the labels"' });

  const vague = hits(low, LAZY_VAGUE);
  if (vague.length) fails.push({ code: 'lazy-ambiguity', terms: vague, msg: 'undefinable terms make the task unfair' });

  const exact = /\b(exact|exactly|match(es|ed)? the reference|byte[- ]identical)\b/i.test(src);
  const heldout = /\b(held[- ]?out|separate set|a fresh set|new (set|inputs|trajectories|states)|disjoint)\b/i.test(src);
  if (!exact) warns.push({ code: 'no-exact-grading', terms: [], msg: 'no explicit exact-match wording (our reliable verifier grades exact; state it)' });
  else if (!heldout) notes.push({ code: 'no-heldout-wording', terms: [], msg: 'exact grading present but no explicit held-out/separate-set wording' });

  const fileTokens = [...src.matchAll(/(^|[\s`(])([\w.\-/]+\.(?:json|csv|txt|py|md|wav|bin|jsonl|toml))\b/g)].map((m) => m[2]);
  const relPaths = [...new Set(fileTokens.filter((f) => !f.startsWith('/')))];
  if (relPaths.length) warns.push({ code: 'relative-paths', terms: relPaths.slice(0, 6), msg: 'rubric wants absolute /app/... paths' });

  if (tokens > 1500) warns.push({ code: 'token-budget', terms: [String(tokens)], msg: 'over the ~1500-token rubric cap' });

  const verdict = fails.length ? 'FAIL' : warns.length ? 'PASS_WARN' : 'PASS';
  return {
    verdict, tokens, fails, warns, notes,
    structure: { requirements: s.requirements, couplings: s.dependencies, complexity: s.complexity },
    scores: s,
  };
}

export function dynamoLintReport(r) {
  const lines = [];
  lines.push(`structure : requirements ${r.structure.requirements}  couplings ${r.structure.couplings}  complexity ${r.structure.complexity}  | ~${r.tokens} tokens`);
  lines.push(`analyzer  : clarity ${(r.scores.clarity * 100) | 0}%  completeness ${(r.scores.completeness * 100) | 0}%  verifiable ${r.scores.verifiable ? 'YES' : 'NO'}`);
  const line = (tag, x) => lines.push(`  ${tag}  ${x.code.toUpperCase()}: ${x.msg}${x.terms.length ? ' -> ' + x.terms.join(', ') : ''}`);
  for (const x of r.fails) line('FAIL', x);
  for (const x of r.warns) line('WARN', x);
  for (const x of r.notes) line('note', x);
  if (!r.fails.length && !r.warns.length) lines.push('  ok    no method leak, no bad framing, no lazy ambiguity, paths+length clean');
  lines.push(`VERDICT: ${r.verdict === 'FAIL' ? 'FAIL (fix before submit)' : r.verdict === 'PASS_WARN' ? 'PASS with warnings (review each)' : 'PASS'}`);
  return lines.join('\n');
}
