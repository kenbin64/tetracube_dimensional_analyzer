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
  selfVerifiable:
    'can the agent check a hypothesis for free against what it was handed? intact stripes, sample '
    + 'pairs, or an answer that validates itself all act as a local oracle',
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
    at: { selfVerifiable: false, frameGiven: false, reflexConfidentlyWrong: true, smoothCrux: false } },
  { task: 'dynamo-3b8c2d6 keyed modular checksum', outcome: 'pass@2 0/2', stumps: true,
    at: { selfVerifiable: false, frameGiven: true, reflexConfidentlyWrong: true, smoothCrux: false } },
  { task: 'dynamo-47f3bb3 v2 secret modulus', outcome: 'pass@5 3/5', stumps: false,
    at: { selfVerifiable: true, frameGiven: true, reflexConfidentlyWrong: true, smoothCrux: false } },
  { task: 'dynamo-47f3bb3 v3 secret coefficients', outcome: 'pass@5 3/5', stumps: false,
    at: { selfVerifiable: true, frameGiven: true, reflexConfidentlyWrong: true, smoothCrux: false } },
  { task: 'dynamo-3b8c2d6 v1 format-from-samples', outcome: 'pass@2 2/2', stumps: false,
    at: { selfVerifiable: true, frameGiven: true, reflexConfidentlyWrong: false, smoothCrux: false } },
  { task: 'dynamo-fb6f02d chart layout', outcome: 'pass@2 2/2', stumps: false,
    at: { selfVerifiable: true, frameGiven: true, reflexConfidentlyWrong: false, smoothCrux: true } },
  { task: 'crypto key-recovery', outcome: 'solved 2/2 both regimes', stumps: false,
    at: { selfVerifiable: true, frameGiven: true, reflexConfidentlyWrong: false, smoothCrux: false } },
];

// ── the manifold ─────────────────────────────────────────────────────────────
// A local oracle is decisive: if the agent can score its own guesses for free, it will search until
// it wins, and nothing buried inside the frame changes that. Without one, the task holds when the
// agent is either pointed at the wrong method or has no idea which method to reach for.
export function derive(at) {
  for (const k of Object.keys(AXES)) if (typeof at[k] !== 'boolean') return null;   // off the edge

  if (at.smoothCrux) {
    return { stumps: false, because: 'the crux is smooth, so it is a regression and the agent fits it' };
  }
  if (at.selfVerifiable) {
    return {
      stumps: false,
      because: 'the agent can score its own hypotheses for free, so it searches until it wins; '
        + 'burying more secrets inside the frame does not change that',
    };
  }
  if (!at.frameGiven || at.reflexConfidentlyWrong) {
    return {
      stumps: true,
      because: !at.frameGiven
        ? 'no local oracle and the domain does not name the method, so the agent must find the frame itself'
        : 'no local oracle, and the reflex returns a confident wrong answer rather than failing loudly',
    };
  }
  return null;    // no local oracle, frame handed over, reflex fails loudly: never measured
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
          const at = { selfVerifiable: sv, frameGiven: fg, reflexConfidentlyWrong: rw, smoothCrux: sc };
          if (!seen.has(key(at))) gaps.push({ at, derives: derive(at) });
        }
      }
    }
  }
  return gaps;
}

const key = (at) => Object.keys(AXES).map((k) => (at[k] ? 1 : 0)).join('');
