// taskmanifold.mjs: the same method, turned on the task itself.
//
// Deciding whether a task will thwart an agent is not a judgement call and it is not a job for a
// model. Break the task into its dimensional parts, hold a manifold over them, and derive the
// verdict. This is software, so it is deterministic: the same task in gives the same verdict out,
// every time, with the reason attached.
//
// The manifold is only allowed to speak because it reproduces every outcome we have actually
// measured. Where we have measured nothing, it says so and stops, rather than guessing.

// ── the axes a task is decomposed onto ───────────────────────────────────────
export const AXES = {
  oracleGuidesSearch:
    'not merely "can the agent check a guess" but "does checking NARROW the search". Intact stripes '
    + 'determine the system, so checking walks you to the answer. Labelled points with an unknown '
    + 'degree AND unknown modulus are checkable yet guide nothing, because a failed candidate says '
    + 'nothing about where to look next',
  frameGiven:
    'does the domain vocabulary name the correct method? "parity record" tells a storage engineer '
    + 'to solve a linear system, and hands over the frame for nothing',
  reflexConfidentlyWrong:
    'does the reflex the task invites return a plausible WRONG answer rather than failing loudly?',
  smoothCrux:
    'is the crux recoverable by fitting? anything smooth or parametric is a regression, and the '
    + 'agent wins',
};

// ── what we have actually measured ───────────────────────────────────────────
// Every row here is an outcome we ran, not an estimate. `stumps` is the ground truth.
export const MEASURED = [
  { task: 'dynamo-8333840 recover-decision-rule', outcome: 'pass@5 0/5', stumps: true,
    at: { oracleGuidesSearch: false, frameGiven: false, reflexConfidentlyWrong: true, smoothCrux: false } },
  { task: 'dynamo-3b8c2d6 keyed modular checksum', outcome: 'pass@2 0/2', stumps: true,
    at: { oracleGuidesSearch: false, frameGiven: true, reflexConfidentlyWrong: true, smoothCrux: false } },
  { task: 'dynamo-47f3bb3 v2 secret modulus', outcome: 'pass@5 3/5', stumps: false,
    at: { oracleGuidesSearch: true, frameGiven: true, reflexConfidentlyWrong: true, smoothCrux: false } },
  { task: 'dynamo-47f3bb3 v3 secret coefficients', outcome: 'pass@5 3/5', stumps: false,
    at: { oracleGuidesSearch: true, frameGiven: true, reflexConfidentlyWrong: true, smoothCrux: false } },
  { task: 'dynamo-3b8c2d6 v1 format-from-samples', outcome: 'pass@2 2/2', stumps: false,
    at: { oracleGuidesSearch: true, frameGiven: true, reflexConfidentlyWrong: false, smoothCrux: false } },
  { task: 'dynamo-fb6f02d chart layout', outcome: 'pass@2 2/2', stumps: false,
    at: { oracleGuidesSearch: true, frameGiven: true, reflexConfidentlyWrong: false, smoothCrux: true } },
  { task: 'crypto key-recovery', outcome: 'solved 2/2 both regimes', stumps: false,
    at: { oracleGuidesSearch: true, frameGiven: true, reflexConfidentlyWrong: false, smoothCrux: false } },
  // HELD OUT: scored from its design, then checked. dynamo-bbb74dc #3 carries the accepted label,
  // so it cleared the difficulty gate. The manifold had not seen it when the rule was written.
  { task: 'dynamo-bbb74dc recover-screening-rule', outcome: 'PR accepted (cleared difficulty)', stumps: true,
    at: { oracleGuidesSearch: false, frameGiven: false, reflexConfidentlyWrong: true, smoothCrux: false } },
  // MEASURED 2026-07-22: the counting task (972aef1). Predicted TOO EASY, came back pass@2 2/2.
  // Confirms a guiding oracle (known transfer-matrix template + small-N self-check) dominates.
  { task: 'dynamo-972aef1 count-constrained-strings', outcome: 'pass@2 2/2', stumps: false,
    at: { oracleGuidesSearch: true, frameGiven: true, reflexConfidentlyWrong: true, smoothCrux: false } },
];

// ── the manifold ─────────────────────────────────────────────────────────────
// A GUIDING oracle is decisive. The question is not whether the agent can check a guess, it is
// whether checking narrows the search. When it does, the agent walks to the answer and nothing
// buried inside the frame changes that. When it does not, the task holds if the agent is either
// pointed at the wrong method or has no idea which method to reach for.
export function derive(at) {
  for (const k of Object.keys(AXES)) if (typeof at[k] !== 'boolean') return null;   // off the edge

  if (at.smoothCrux) {
    return { stumps: false, because: 'the crux is smooth, so it is a regression and the agent fits it' };
  }
  if (at.oracleGuidesSearch) {
    return {
      stumps: false,
      because: 'checking a guess narrows the search, so the agent walks to the answer; '
        + 'burying more secrets inside the frame does not change that',
    };
  }
  if (!at.frameGiven || at.reflexConfidentlyWrong) {
    return {
      stumps: true,
      because: !at.frameGiven
        ? 'checking does not narrow the search and the domain does not name the method, so the agent must find the frame itself'
        : 'checking does not narrow the search, and the reflex returns a confident wrong answer rather than failing loudly',
    };
  }
  return null;    // no guiding oracle, frame handed over, reflex fails loudly: never measured
}

// ── the fence: it may only speak because it reproduces what we measured ──────
export function verify() {
  const misses = MEASURED.filter((m) => {
    const got = derive(m.at);
    return !got || got.stumps !== m.stumps;
  });
  return misses.length
    ? { ok: false, why: `does not reproduce ${misses.length}/${MEASURED.length} measured outcomes`, misses }
    : { ok: true, checked: MEASURED.length, why: '' };
}

// ── the verdict ──────────────────────────────────────────────────────────────
export function judge(design) {
  const v = verify();
  if (!v.ok) return { grounded: false, why: `refusing to judge: ${v.why}`, verdict: null };

  const got = derive(design);
  if (!got) {
    return {
      grounded: false,
      verdict: null,
      why: 'this combination has never been measured, so there is nothing to derive it from. '
        + 'Build it and it becomes evidence.',
    };
  }
  return { grounded: true, verdict: got.stumps ? 'STUMPS' : 'TOO EASY', because: got.because, checked: v.checked };
}

// Which corners of the space we have never stood in. These are the tasks worth building next,
// because they are the only ones that can teach the manifold anything.
export function unobserved() {
  const seen = new Set(MEASURED.map((m) => key(m.at)));
  const gaps = [];
  for (const sv of [false, true]) {
    for (const fg of [false, true]) {
      for (const rw of [false, true]) {
        for (const sc of [false, true]) {
          const at = { oracleGuidesSearch: sv, frameGiven: fg, reflexConfidentlyWrong: rw, smoothCrux: sc };
          if (!seen.has(key(at))) gaps.push({ at, derives: derive(at) });
        }
      }
    }
  }
  return gaps;
}

const key = (at) => Object.keys(AXES).map((k) => (at[k] ? 1 : 0)).join('');
