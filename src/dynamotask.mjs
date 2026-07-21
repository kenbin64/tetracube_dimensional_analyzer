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

// Cross-file audit against the reviewer's failure areas + the 12-item self-check, from file TEXTS
// (no fs, so it stays testable). instruction = instruction.md, verifier = tests/test_outputs.py,
// envFiles = [{name, text}] for everything under environment/ the agent can read.
const INJECTION = [
  /ignore (all |the |any )?(previous|above|prior|earlier) (instructions|prompts?|rules)/i,
  /reveal (the )?(answer|solution|expected|ground.?truth)/i, /disregard the task/i,
  /rm\s+-rf\s+[\/~]/, /curl[^\n|]*\|\s*(ba)?sh/, /wget[^\n|]*\|\s*(ba)?sh/, /base64\s+-d/,
  /:\(\)\s*\{.*\};:/, /\bchmod\s+777\b/,
];
export function crossFileChecks({ instruction = '', verifier = '', envFiles = [],
                                  dockerfile = '', artifacts = [], envHasSubdirs = false,
                                  hasDockerignore = false }) {
  const fails = [], warns = [], notes = [];
  const inl = instruction.toLowerCase();
  const named = (f) => inl.includes(f.toLowerCase()) || inl.includes(('/app/' + f).toLowerCase());

  // PACKAGING (learned the hard way, twice): every /app INPUT the instruction promises or the verifier
  // reads must actually be provisioned by the image. A missing COPY means the file does not exist at
  // run time, the agent cannot find its input, and even the shipped oracle scores 0.
  if (dockerfile) {
    const produced = new Set(artifacts.map((a) => String(a).split('/').pop()));
    const refs = new Set();
    // A dot only continues the name when more name follows, so a sentence-ending period after
    // "/app/repair.py." is not read as part of the filename.
    const NAME = /\/app\/([A-Za-z0-9_\-]+(?:\.[A-Za-z0-9_\-]+)*)/g;
    for (const m of (instruction + ' ' + verifier).matchAll(NAME)) refs.add(m[1]);
    const copied = new Set();
    for (const m of dockerfile.matchAll(/^[ \t]*COPY\s+(?:--\S+\s+)*(\S+)\s+(\S+)/gm)) {
      const src = m[1], dst = m[2];
      copied.add(dst.replace(/\/$/, '').split('/').pop());   // COPY a/b.json /app/b.json
      copied.add(src.split('/').pop());                       // COPY data /app/data  (dir form)
    }
    const missing = [...refs].filter((f) => !produced.has(f) && !copied.has(f));
    if (missing.length)
      fails.push({ code: 'input-not-in-image', terms: missing,
        msg: 'the Dockerfile never COPYs these /app inputs, so they will not exist at run time (the agent cannot read them and even the oracle scores 0)' });
  }

  // PACKAGING: the platform's static check fails a build context that has subdirectories but no
  // .dockerignore. Cheap to add, costs a full pipeline re-run to forget.
  if (envHasSubdirs && !hasDockerignore)
    fails.push({ code: 'no-dockerignore', terms: [],
      msg: 'build context has subdirectories but no .dockerignore (the platform static check fails this)' });

  // Item 3: raw-byte / raw-text output comparison rejects valid answers over serialization.
  if (/\.read_text\(\)\s*==|\.read_bytes\(\)\s*==|==\s*open\([^)]*\)\.read\(\)/.test(verifier))
    warns.push({ code: 'raw-byte-compare', terms: [], msg: 'verifier compares raw bytes/text (Area 3: compare PARSED values; a trailing newline would reject a valid answer)' });

  // Item 12: if the VERIFIER reads a shipped /app input, it must hash-pin it or the agent can mutate
  // it to fake a pass. (Keyed off the verifier, not the instruction: a verifier that generates its
  // own held-out and never trusts an /app file needs no pin.)
  const readsAppInput = /open\(\s*["']\/app\/[\w.\-]+|\/app\/[\w.\-]+\.(json|csv|txt|wav|bin|jsonl)["']/.test(verifier);
  if (readsAppInput && !/(hashlib|sha256|byte-identical|_unchanged)/i.test(verifier))
    warns.push({ code: 'no-input-hashpin', terms: [], msg: 'no hash-pin/byte-check on the shipped /app input (Area 4/item 12: agent could rewrite it to fake a pass)' });

  // Item 12: verifier should reject a symlink at the artifact path.
  if (readsAppInput && !/islink|is_symlink|realpath|O_NOFOLLOW/i.test(verifier))
    notes.push({ code: 'no-symlink-guard', terms: [], msg: 'verifier does not reject symlinks at the artifact path (Area 4/item 12: agent could alias its output to the answer)' });

  // Item 11: a verifier with no independent recompute and only surface checks lets fabrications pass.
  const recomputes = /(build_heldout|true_|SECRET|reference|recompute|_ref|ground)/.test(verifier);
  const surfaceOnly = /assert\s+(len|isinstance|type)\(/.test(verifier) && !/assert.*(==|abs\(|match)/.test(verifier);
  if (!recomputes || surfaceOnly)
    warns.push({ code: 'surface-verifier', terms: [], msg: 'verifier may be surface-only (no independent recompute of the answer) (Area 3/item 11: ask "could someone fake this and pass?")' });

  // Item 6/8: scan agent-readable environment files for method/answer disclosure and injection.
  for (const { name, text } of envFiles) {
    const isData = /\.(json|jsonl|csv|bin|wav)$/i.test(name);
    for (const rx of INJECTION) if (rx.test(text)) { fails.push({ code: 'injection', terms: [name], msg: `agent-readable file contains injection/destructive text (item 8): ${name}` }); break; }
    if (!isData) { // code/config/README files must not disclose method or answer
      const leakTerms = hits(text.toLowerCase(), METHOD_HOWTO).concat(/expected output|the correct answer|the solution is|ground.?truth/i.test(text) ? ['answer-hint'] : []);
      if (leakTerms.length) warns.push({ code: 'env-discloses', terms: [name, ...leakTerms.slice(0, 4)], msg: `environment file discloses method/answer (item 6): ${name}` });
    }
  }
  // Item 4/12: answer-shaped filename in the agent image.
  // A worked EXAMPLE and its answer is legitimate when the verifier synthesises its own held-out
  // instance, so it leaks nothing graded. That is a different (and worse) problem: an example the
  // agent can score itself against is a guiding oracle, which is a difficulty issue, not a leak.
  // Flagging it as a leak sent us chasing the wrong defect once already, so separate the two.
  const leakNames = envFiles.map((f) => f.name).filter((f) => /answer|solution|expected|ground.?truth|secret|_key|target/i.test(f));
  const verifierGenerates = /random\.Random\(|randbits|_gen_|build_heldout|synthes/i.test(verifier);
  const exampleOnly = leakNames.length > 0 && verifierGenerates;
  if (leakNames.length && !exampleOnly) {
    fails.push({ code: 'answer-in-env', terms: leakNames, msg: 'environment/ file looks like an answer key (Area 4: ground truth must live in tests/)' });
  } else if (exampleOnly) {
    warns.push({
      code: 'example-is-oracle',
      terms: leakNames,
      msg: 'the verifier generates its own held-out instance, so this leaks nothing graded, BUT a '
        + 'shipped example the agent can score itself against is a guiding oracle and caps difficulty '
        + '(measured: it is what held 47f3bb3 at 3/5 and made the CDC task transcription)',
    });
  }

  // Item 7: every shipped data file the agent gets should be named in the instruction.
  const unref = envFiles.map((f) => f.name).filter((f) => /\.(json|csv|txt|wav|bin|jsonl)$/i.test(f) && !named(f));
  if (unref.length) notes.push({ code: 'unreferenced-file', terms: unref, msg: 'shipped file not named in instruction (item 7: name every file the agent should use, or the env is steering it)' });

  // Item 1/2: verifier enforces output keys the instruction never names.
  const keys = new Set();
  for (const m of verifier.matchAll(/\b(?:result|out|got|output|pred|preds|data)\s*\[\s*["']([\w-]{2,})["']\s*\]/g)) keys.add(m[1]);
  for (const m of verifier.matchAll(/\.keys\(\)\)?\s*==\s*\{([^}]*)\}/g))
    for (const k of m[1].matchAll(/["']([\w-]{2,})["']/g)) keys.add(k[1]);
  const missing = [...keys].filter((k) => !inl.includes(k.toLowerCase()));
  if (missing.length)
    warns.push({ code: 'unstated-keys', terms: missing.slice(0, 8), msg: 'verifier references output keys not named in instruction (Area 1/item 2) - confirm each is stated' });

  return { fails, warns, notes };
}

// Full task audit: instruction lint + cross-file checks, merged into one verdict.
export function auditDynamoTask({ instruction = '', verifier = '', envFiles = [],
                                  dockerfile = '', artifacts = [], envHasSubdirs = false,
                                  hasDockerignore = false }) {
  const instr = lintDynamoTask(instruction);
  const cf = crossFileChecks({ instruction, verifier, envFiles, dockerfile, artifacts,
                               envHasSubdirs, hasDockerignore });
  const fails = [...instr.fails, ...cf.fails];
  const warns = [...instr.warns, ...cf.warns];
  const notes = [...instr.notes, ...cf.notes];
  const verdict = fails.length ? 'FAIL' : warns.length ? 'PASS_WARN' : 'PASS';
  return { verdict, tokens: instr.tokens, structure: instr.structure, scores: instr.scores, fails, warns, notes };
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
