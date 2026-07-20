// stumpsmith.mjs — a deterministic generator of stump scenarios. dynamotask.mjs LINTS a finished task;
// this proposes what to build in the first place. No model in the loop: it encodes the structural rule
// for why an AI fails a task and scores candidates against it, so an AI can ideate freely and this
// filters what the AI proposes. AI generates, the fixed rule judges. That split is the point: a guesser
// grading its own guess is the same failure one level up.
//
// The rule, stated once. An AI is weak exactly where you already hold the answer: the forward map
// (compute the output) is cheap and one-way, its inverse (recover the rule from outputs) is many-to-one
// and only pinned down by a hidden constraint. The constraint that reliably defeats a strong solver is a
// CREASE: a non-smooth feature of the forward map that the memorized, continuous inverse smooths away.
// Grade at an exact bar and the smoothed answer is confidently wrong.
//
// A stump needs FIVE things all true (the scorer checks each), plus one preference:
//   1 asymmetry            the verifier holds ground truth the agent never sees
//   2 non-self-verifiable  the agent cannot cheaply check its own output without the secret
//   3 confident reflex     a NAMED memorized method returns a plausible WRONG answer
//   4 exact bar            100% match, no tolerance, so "close" fails
//   5 crease present       at least one non-smooth op the reflex flattens
//   + clean-fail preferred a CHEAP reflex (fast wrong answer) beats a crux that makes the agent grind;
//                          grinding invites framework timeouts/wedges that muddy the difficulty evidence.

// The crease catalog: the non-smooth operations that break a continuous / memorized inverse.
// geometry = the shape it puts in the forward map. defeats = the reflex it makes confidently wrong.
export const CREASES = [
  { name: 'fold',      geometry: 'saturation clamp (min/max), a flat crease',      keywords: ['clip', 'clamp', 'saturat', 'min(', 'max(', 'floor at', 'cap at'],
    defeats: 'a linear/least-squares fit that ignores the flat region and extrapolates through it',
    selfVerifiableRisk: 'low: in the saturated band many inputs map to one output, so the inverse is not recoverable there' },
  { name: 'staircase', geometry: 'rounding / quantization to integers, a step function',  keywords: ['round', 'quantiz', 'integer', 'nearest', 'half to even', 'fixed-point', 'requantiz'],
    defeats: 'a float model then round: its rounding boundaries do not coincide with the true steps, and the residual biases the fit',
    selfVerifiableRisk: 'low: the step means "almost right" gives a different integer, so nearness tells the agent nothing' },
  { name: 'wrap',      geometry: 'modular reduction, a cut-and-wrap of the line',    keywords: ['mod ', 'modulo', 'modular', 'prime field', 'finite field', 'gf(', 'congruen'],
    defeats: 'ordinary regression / interpolation over the reals, which cannot see the wrap',
    selfVerifiableRisk: 'low: reducing mod p destroys order and magnitude cues the agent would use to self-check' },
  { name: 'shear',     geometry: 'position / index dependent weighting, a shear of the axis', keywords: ['position', 'index', 'weighted by', 'per-position', 'order matters', 'i-th', 'place value'],
    defeats: 'an order-invariant summary (sum, count, mean) that drops where each value sat',
    selfVerifiableRisk: 'medium: the agent can partially check on short inputs; keep held-out inputs longer than any seen' },
  { name: 'mask',      geometry: 'a hidden subset of coordinates carries the rule, the rest are decoys', keywords: ['subset', 'only some', 'held-out', 'relevant coordinates', 'decoy', 'irrelevant feature'],
    defeats: 'a model that uses all coordinates equally and is misled by the decoys',
    selfVerifiableRisk: 'medium: hide which coordinates matter; do not let the seen sample reveal the mask' },
  { name: 'braid',     geometry: 'two or more streams interleaved by a hidden schedule',  keywords: ['interleav', 'interspers', 'two streams', 'alternating', 'multiplex', 'round-robin', 'schedule'],
    defeats: 'a single-process fit that assumes one generator behind the data',
    selfVerifiableRisk: 'low: the schedule is unobservable from outputs alone until reconstructed' },
];

const norm = (v) => String(v == null ? '' : v).toLowerCase();
function detectCreases(text) {
  const low = norm(text);
  return CREASES.filter((c) => c.keywords.some((k) => low.indexOf(k) !== -1));
}

// A spec is a plain object describing a candidate task. Every field is optional; the scorer reads what
// is present and infers the rest from the text of forwardMap + reflex.
//   forwardMap        string: the cheap one-way map (the layer / rule that produces outputs)
//   reflex            string: the memorized method a strong solver reaches for first
//   reflexIsCheap     bool  : does that reflex run fast (a clean fast wrong answer) rather than grind
//   creases           [str] : crease names present; if omitted, detected from forwardMap text
//   exactBar          bool  : graded at 100% exact match, no tolerance
//   verifierHoldsTruth bool : the answer key lives only in the verifier, generated fresh (asymmetry)
//   selfVerifiable    bool  : can the agent cheaply confirm its own output WITHOUT the secret
//   canonicalSolver   bool  : is there a well-known algorithm that is simply "the correct answer"
export function stumpScore(spec = {}) {
  const s = spec || {};
  const creaseObjs = (Array.isArray(s.creases) && s.creases.length)
    ? CREASES.filter((c) => s.creases.map(norm).includes(c.name))
    : detectCreases(s.forwardMap);
  const reflexText = norm(s.reflex);
  const reflexNamed = reflexText.length > 0;

  // The five must-haves. Each is either given explicitly or inferred conservatively from the text.
  const checks = {
    asymmetry:           s.verifierHoldsTruth === true,
    nonSelfVerifiable:   s.selfVerifiable === false || (s.selfVerifiable == null && creaseObjs.length > 0),
    confidentReflex:     reflexNamed,
    exactBar:            s.exactBar === true,
    creasePresent:       creaseObjs.length > 0,
  };
  const met = Object.values(checks).filter(Boolean).length;

  // Preference, not a gate: a cheap reflex yields a clean fast fail; a canonical solver is a novelty risk.
  const cleanFail = s.reflexIsCheap === true;
  const noveltyRisk = s.canonicalSolver === true;

  const missing = Object.entries(checks).filter(([, v]) => !v).map(([k]) => k);
  let verdict;
  if (met === 5 && !noveltyRisk) verdict = 'stump';
  else if (met >= 3) verdict = 'leaky';       // some asymmetry, but a hole a strong solver walks through
  else verdict = 'symmetric';                  // fully specified both ways: it will not reliably stump

  const fixes = [];
  if (!checks.asymmetry) fixes.push('put the answer key only in the verifier and generate held-out cases fresh from a secret seed');
  if (!checks.nonSelfVerifiable) fixes.push('remove any cheap self-check: the agent must not be able to confirm its own output without the secret (avoid g^x==y style invertibility)');
  if (!checks.confidentReflex) fixes.push('name the single memorized method a strong solver reaches for first; if none, the task is not a trap, it is just work');
  if (!checks.exactBar) fixes.push('grade at 100% exact match on every element, no tolerance, so an approximate answer fails');
  if (!checks.creasePresent) fixes.push('add a crease the reflex smooths over: ' + CREASES.map((c) => c.name).join(', '));
  if (noveltyRisk) fixes.push('a well-known solver exists for this: change the crux so the memorized approach is confidently WRONG, not merely the intended answer');
  if (met === 5 && !cleanFail) fixes.push('prefer a CHEAP reflex so the agent fails fast and clean; a crux that forces an hour of grinding invites framework timeouts that muddy the difficulty evidence');

  return {
    verdict, score: met, of: 5, cleanFail, noveltyRisk,
    creases: creaseObjs.map((c) => c.name),
    checks, missing, fixes,
  };
}

// Given a domain and a cheap forward map, rank the creases that would turn it into a stump. Each seed is
// a one-line task idea plus the exact reflex it defeats and the score it would earn if built with an
// exact bar and verifier-held truth (the two things you control at build time).
export function proposeStumps(spec = {}) {
  const domain = String(spec.domain || 'a deployed deterministic rule');
  const forwardMap = String(spec.forwardMap || 'a cheap forward map from input to output');
  const applicable = detectCreases(forwardMap);
  const pool = applicable.length ? applicable : CREASES;
  return pool
    .map((c) => {
      const built = stumpScore({
        forwardMap: forwardMap + ' with a ' + c.name + ' (' + c.geometry + ')',
        reflex: c.defeats,
        reflexIsCheap: true,
        creases: [c.name],
        exactBar: true,
        verifierHoldsTruth: true,
        selfVerifiable: false,
        canonicalSolver: false,
      });
      return {
        crease: c.name,
        geometry: c.geometry,
        seed: 'In ' + domain + ', log input/output pairs of ' + forwardMap + ' where the true map applies a '
          + c.name + ' (' + c.geometry + '). Ask the agent to reproduce outputs exactly on held-out inputs. '
          + 'The reflex, ' + c.defeats + ', is confidently wrong at the exact bar.',
        defeatsReflex: c.defeats,
        selfVerifiableRisk: c.selfVerifiableRisk,
        score: built.score, verdict: built.verdict,
      };
    })
    .sort((a, b) => b.score - a.score);
}

// The AI-ideation half, done right: hand an AI the parameters plus the fixed checklist and ask the two
// questions that matter. The AI generates candidates; feed each back through stumpScore to filter. This
// returns the prompt text; it does NOT call any model.
export function adversaryPrompt(spec = {}) {
  const fm = String(spec.forwardMap || '<the forward map / rule>');
  const domain = String(spec.domain || '<the domain>');
  return [
    'You are red-teaming a task meant to stump a strong coding agent. Domain: ' + domain + '.',
    'Candidate forward map (cheap to compute, one input to one output): ' + fm + '.',
    '',
    'Answer two questions only:',
    '  Q1. What is the SINGLE approach a strong solver reaches for first here, and does it return a',
    '      confident answer that is WRONG at a 100% exact-match bar? Name the method, say why it is the',
    '      reflex, and say precisely where it is wrong (which crease it smooths over).',
    '  Q2. What can the agent NOT check about its own output without the hidden answer key? If it can',
    '      cheaply self-verify (e.g. plug the answer back in and confirm), the task will not stump; say so.',
    '',
    'Constraints for any idea you propose:',
    '  - the answer key must live only in the verifier, held-out cases generated fresh from a secret seed',
    '  - grading is exact, every element, no tolerance',
    '  - prefer a CHEAP wrong-reflex (agent fails fast and clean) over a crux that forces long grinding',
    '  - the crease must be one of: ' + CREASES.map((c) => c.name).join(', ') + ' (or a new non-smooth op you name)',
    '',
    'Return each idea as: {forwardMap, reflex, crease, selfVerifiable:true|false, exactBar:true}.',
  ].join('\n');
}

// Human-readable roll-up for a single candidate spec.
export function stumpReport(spec = {}) {
  const r = stumpScore(spec);
  const L = [];
  L.push('stump verdict: ' + r.verdict.toUpperCase() + '  (' + r.score + '/' + r.of + ' invariants met)');
  L.push('  creases: ' + (r.creases.length ? r.creases.join(', ') : 'NONE'));
  L.push('  clean-fail preferred: ' + (r.cleanFail ? 'yes' : 'no') + '   novelty risk: ' + (r.noveltyRisk ? 'YES' : 'no'));
  if (r.missing.length) L.push('  missing: ' + r.missing.join(', '));
  if (r.fixes.length) { L.push('  fixes:'); r.fixes.forEach((f) => L.push('    - ' + f)); }
  return L.join('\n');
}
