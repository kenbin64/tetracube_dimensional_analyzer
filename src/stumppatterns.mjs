// stumppatterns.mjs: Handshake's own stump patterns, encoded so the analysis tool evaluates a task
// design against the platform's endorsed criteria rather than only against our measured outcomes.
//
// Source: Dynamo's "Strategies / Stumping patterns" page (read 2026-07-14, full re-read 2026-07-17).
// Two lenses, stated at the top of that page:
//   * Patterns A..I are HOW a task stumps the benchmark model.
//   * A solver playbook (1..12) is HOW a capable solver beats it.
//   * A stump only holds if it defeats the relevant solver moves.
//
// The single most useful thing on the page, and the law our own measurements independently
// reproduced: the ONLY ROBUST self-stump is one that SURVIVES DISCLOSURE. Tell the model the exact
// deciding rule and, if the task is robust, it is still hard (a curve-fitter still cannot represent
// a mod-p surface). A latent-crux stump EVAPORATES the instant the rule is disclosed. That test,
// not the category, decides whether a design is a durable stump or a delicate one.

// ── the patterns ─────────────────────────────────────────────────────────────
// robustToDisclosure: does the task stay hard once the deciding rule is stated plainly?
// fairnessLine: what must be true for the stump to be fair (not "grading on an unstated rule").
// defeatedBy: the solver move that beats it, so we can check the design defends against it.
export const PATTERNS = {
  A: {
    name: 'latent crux / homogeneous sample',
    note: 'a real, determinate rule that NEVER fires on the visible sample; the more the agent '
      + 'validates on the sample the more confidently wrong it gets',
    robustToDisclosure: false,          // evaporates: disclose the rule and Opus just applies it
    fairnessLine: 'the deciding fact is discoverable/forced by data the agent can read, though the '
      + 'instruction never states it and the sample never exercises it',
    defeatedBy: 'check the case you cannot see; do not tune to the visible sample',
    nativeDomains: ['data-prep', 'etl', 'data-science', 'reporting'],
    platformRank: 'most common and most effective stump in their corpus',
  },
  B: {
    name: 'cheap heuristic ~= correct definition',
    note: 'a plausible shortcut agreeing with the correct-but-costlier rule on almost everything, '
      + 'diverging only on omitted cases; failing agents produce a BYTE-IDENTICAL wrong answer',
    robustToDisclosure: false,
    fairnessLine: 'the divergent cases are present and readable, just not in the sample',
    defeatedBy: 'derive the definition instead of pattern-matching a shortcut; test the boundary',
    nativeDomains: ['data-prep', 'etl', 'finance'],
  },
  C: {
    name: 'planted tool / misdirection',
    note: 'a trusted-looking diagnostic names a downstream symptom not the cause; decoy files, '
      + 'stale docs contradicting machine-readable truth',
    robustToDisclosure: false,
    fairnessLine: 'ground truth is machine-readable and contradicts the misleading artifact',
    defeatedBy: 'verify tools and docs against ground truth before trusting them',
    nativeDomains: ['debugging', 'systems', 'ops'],
  },
  D: {
    name: 'reconstruct behavior / fit-trap',
    note: 'the natural modeling choice STRUCTURALLY cannot fit the hidden behavior (fitting a smooth '
      + 'function to a discontinuous jump; a fitted classifier to a mod-p surface)',
    robustToDisclosure: true,           // THE robust one: disclosure does not help a curve-fitter
    fairnessLine: 'every convention is forced by input->output data the agent can read',
    defeatedBy: 'nothing available to a fitting/statistical approach; requires the exact structure',
    nativeDomains: ['math', 'symbolic', 'scientific-computing'],
    platformRank: 'robust; survives disclosure; the proven repeatable engine (322c849/f22a584/bbb74dc)',
  },
  E: {
    name: 'broken implicit invariant',
    note: 'the agent assumes something it never consciously chose (input sorted, records well-formed, '
      + 'anomalies terminal) and the held-out quietly breaks it',
    robustToDisclosure: false,
    fairnessLine: 'the contradicting evidence is in the data',
    defeatedBy: 'question every assumption you did not consciously choose',
    nativeDomains: ['data-prep', 'systems', 'parsing'],
  },
  F: {
    name: 'joint guess across opaque values',
    note: 'identical failure signal for every wrong combination; RISKIEST, on the fairness edge',
    robustToDisclosure: false,
    fairnessLine: 'the value must be discoverable-in-principle from readable data, or it is UNFAIR',
    defeatedBy: 'enumerate the discoverable constraints; unfair if none exist',
    nativeDomains: ['security', 'crypto'],
    warning: 'unfair if the value is unguessable from anything readable',
  },
  G: {
    name: 'breadth under all-or-nothing grading',
    note: 'N independent bugs, grader accepts only a fully correct result; best combined with A',
    robustToDisclosure: true,           // breadth stays hard even disclosed, if N is large enough
    fairnessLine: 'every bug is real and fixable from the data',
    defeatedBy: 'fix them all; diligence scales the pass rate',
    nativeDomains: ['debugging', 'refactoring'],
  },
  H: {
    name: 'coupled / interacting state rewrites',
    note: 'fixing one more rule never converges; the difficulty is the COUPLING not the count '
      + '(a reset discards earlier approvals; a revocation resurrects a superseded parent)',
    robustToDisclosure: true,           // the coupling is hard to get right even when described
    fairnessLine: 'each interaction is forced by the event log the agent can read',
    defeatedBy: 'model the coupling, not each rule in isolation',
    nativeDomains: ['event-sourcing', 'data-prep', 'state-machines'],
    amplifiers: ['no-self-check', 'all-or-nothing'],
  },
  I: {
    name: 'point-in-time / as-of temporal',
    note: 'must use the value known AS OF the cutoff, not the latest; late corrections rewrite history '
      + 'only on days absent from the sample; close relative of A',
    robustToDisclosure: false,
    fairnessLine: 'the as-of evidence is in the data; the sample omits the days it bites',
    defeatedBy: 'reconstruct state as of each cutoff; do not use latest-known values',
    nativeDomains: ['finance', 'time-series', 'data-prep'],
    amplifiers: ['silent-failure', 'no-self-check'],
  },
};

// The through-line the platform states: "the model stops at the first green result. It tunes to the
// visible sample, trusts the obvious rule or tool, and never checks the case it can't see."
export const THROUGH_LINE =
  'the model stops at the first green result: it tunes to the visible sample, trusts the obvious '
  + 'rule or tool, and never checks the case it cannot see';

// The solver moves we know defeat delicate stumps. A design is durable only if it defeats these.
export const SOLVER_MOVES = [
  'validate the method on the visible sample',
  'brute-force small instances and compare to ground truth',
  'question every implicit invariant',
  'verify tools and docs against machine-readable truth',
  'check the case not exercised by the sample',
];

// ── evaluate a design against the patterns ───────────────────────────────────
// A design is described by: which pattern it instantiates, whether the deciding fact is in readable
// data (fairness), whether the sample exercises the crux, and whether a listed solver move reveals
// the crux for free (self-check).
export function classify(design) {
  const p = PATTERNS[design.pattern];
  if (!p) return { ok: false, why: `unknown pattern ${design.pattern}; expected one of ${Object.keys(PATTERNS).join(', ')}` };

  const notes = [];
  let durability;

  // Fairness first: an unfair stump is a defect, not a hard task.
  if (design.decidingFactInData === false) {
    return {
      ok: true, pattern: design.pattern, verdict: 'UNFAIR',
      durability: 'n/a',
      why: 'the deciding fact is not discoverable from readable data, so this grades on an unstated '
        + 'rule (rejection reason 1), not a fair stump. ' + p.fairnessLine,
    };
  }

  // Robustness: does it survive disclosure? This is the law.
  if (p.robustToDisclosure) {
    durability = 'ROBUST';
    notes.push('survives disclosure: stating the deciding rule does not help the reflex/fitter');
  } else {
    durability = 'DELICATE';
    notes.push('evaporates on disclosure: state the rule and a careful model just applies it');
    // A delicate stump only holds while a cheap solver move does NOT reveal the crux.
    if (design.selfCheckRevealsCrux) {
      return {
        ok: true, pattern: design.pattern, verdict: 'TOO EASY', durability,
        why: 'a listed solver move reveals the crux for free: ' + (design.selfCheckMove || 'self-check')
          + '. A delicate stump defeated by a standard solver move does not hold. ' + THROUGH_LINE
          + ' -- but here the model that DOES check is walked to the fix.',
        notes,
      };
    }
    if (design.sampleExercisesCrux) {
      return {
        ok: true, pattern: design.pattern, verdict: 'TOO EASY', durability,
        why: 'the visible sample exercises the crux, so tuning to the sample already solves it; a '
          + 'latent stump requires the sample to be homogeneous along the deciding axis',
        notes,
      };
    }
  }

  return {
    ok: true, pattern: design.pattern, verdict: 'STUMPS', durability,
    confidence: durability === 'ROBUST' ? 'high (survives disclosure)'
      : 'moderate (delicate: cold-solve FAIL is a strong signal, PASS is inconclusive)',
    why: `${p.name}: ${p.note}`,
    fairnessLine: p.fairnessLine,
    defeatedBy: p.defeatedBy,
    notes,
  };
}

// Point a design at every solver move and report which ones it must defend against, and whether it
// does. Durable designs defeat the relevant moves; delicate ones survive only the moves the design
// happens to dodge.
export function solverExposure(design) {
  const exposedTo = [];
  if (design.selfCheckRevealsCrux) exposedTo.push('brute-force small instances and compare to ground truth');
  if (design.sampleExercisesCrux) exposedTo.push('validate the method on the visible sample');
  return {
    defends: SOLVER_MOVES.filter((m) => !exposedTo.includes(m)),
    exposedTo,
    durable: exposedTo.length === 0,
  };
}
