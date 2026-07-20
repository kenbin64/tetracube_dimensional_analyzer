// taskanalyzer.mjs — read a TASK DESCRIPTION into its dimensional structure, so an agent can see what
// a task actually asks before it acts. This is STRUCTURAL and heuristic, not semantic understanding:
// it surfaces the requirements (the independent axes, the things to do), the dependencies (couplings,
// what must happen in order), the constraints, the success condition (is the task even verifiable?),
// and the places the spec COLLAPSES into the undefinable (subjective or open-ended terms with no
// checkable meaning: "handle it appropriately", "make it robust", "etc"). It gives an agent signals to
// reason over; it does not pass judgment for it. The reading is additive: the original text is kept
// whole as the residual, so nothing is lost and the analysis can never quietly rewrite the task.

const VERBS = ['create', 'build', 'implement', 'add', 'write', 'make', 'ensure', 'return', 'handle', 'support', 'parse', 'generate', 'compute', 'calculate', 'validate', 'verify', 'remove', 'delete', 'update', 'fix', 'design', 'define', 'produce', 'output', 'print', 'read', 'load', 'store', 'save', 'find', 'search', 'analyze', 'sort', 'filter', 'convert', 'transform', 'render', 'display', 'send', 'fetch', 'install', 'configure', 'run', 'test', 'check', 'count', 'merge', 'split', 'extract', 'replace', 'format', 'accept', 'reject'];
const CONSTRAINT = /\b(must not|must|should not|should|cannot|can't|only|at most|at least|no more than|no fewer than|within|exactly|required|never|always|limited to|maximum|minimum)\b/i;
const INPUT = /\b(input|inputs|given|takes|accepts?|argument|arguments|parameter|parameters|reads? from|stdin|from (a|the) file|provided)\b/i;
const OUTPUT = /\b(output|outputs|returns?|produces?|prints?|writes? to|result|results|response|stdout|exit code)\b/i;
const ACCEPT = /\b(test|tests|verif\w*|expected|passes|assert\w*|acceptance|succeeds? when|correct output|should (return|equal|output|print|exit))\b/i;
const DEP = /\b(after|then|once|afterwards|using the|based on|from the (previous|prior|first)|depends on|before you|first,|second,|third,|next,|finally,|subsequently)\b/i;

// where a spec collapses to the undefinable: subjective, open-ended, or unchecked terms
const VAGUE = ['etc', 'and so on', 'and more', 'appropriately', 'appropriate', 'reasonably', 'reasonable', 'properly', 'as needed', 'as necessary', 'as appropriate', 'somehow', 'various', 'several', 'handle edge cases', 'robust', 'efficient', 'performant', 'user-friendly', 'intuitive', 'elegant', 'scalable', 'flexible', 'maintainable', 'todo', 'tbd', 'figure out', 'and such', 'and stuff', 'whatever', 'nicely', 'cleanly', 'clean up', 'better', 'good enough', 'the right', 'make sense', 'or something'];

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const round2 = (x) => Math.round(x * 100) / 100;

function splitUnits(src) {
  const units = [];
  for (const raw of src.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (/^([-*•]|\d+[.)])\s+/.test(line)) { units.push({ text: line.replace(/^([-*•]|\d+[.)])\s+/, ''), bullet: true }); continue; }
    for (const s of line.split(/(?<=[.!?])\s+/)) { if (s.trim()) units.push({ text: s.trim(), bullet: false }); }
  }
  return units;
}

function firstVerb(text) {
  const words = text.toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).slice(0, 4);
  for (const w of words) if (VERBS.includes(w)) return w;
  return null;
}

function detectVague(src) {
  const found = [];
  const low = src.toLowerCase();
  for (const term of VAGUE) {
    let i = 0;
    while ((i = low.indexOf(term, i)) !== -1) {
      const before = i === 0 || /[^a-z]/.test(low[i - 1]);
      const after = i + term.length >= low.length || /[^a-z]/.test(low[i + term.length]);
      if (before && after) found.push({ term, context: src.slice(Math.max(0, i - 18), i + term.length + 18).replace(/\s+/g, ' ').trim() });
      i += term.length;
      if (found.length >= 40) return found;
    }
  }
  return found;
}

export function analyzeTask(text) {
  const src = String(text == null ? '' : text);
  const units = splitUnits(src);
  const requirements = [];
  units.forEach((u, i) => {
    const verb = firstVerb(u.text);
    if (u.bullet || verb) requirements.push({ index: i, text: u.text, verb: verb || null });
  });
  const constraints = units.filter((u) => CONSTRAINT.test(u.text)).map((u) => u.text);
  const inputs = units.filter((u) => INPUT.test(u.text)).map((u) => u.text);
  const outputs = units.filter((u) => OUTPUT.test(u.text)).map((u) => u.text);
  const acceptance = units.filter((u) => ACCEPT.test(u.text)).map((u) => u.text);
  const dependencies = units.map((u, i) => (DEP.test(u.text) ? { index: i, text: u.text } : null)).filter(Boolean);
  const ambiguities = detectVague(src);

  const clarity = clamp01(1 - ambiguities.length / Math.max(6, requirements.length * 3));
  const completeness = [inputs, outputs, constraints, acceptance].filter((a) => a.length).length / 4;
  // verifiable = there is a CHECKABLE success condition, not merely a mention of output. A task an AI
  // could be scored against needs a stated way to check it (a test, an expected result, an exact stdout).
  const verifiable = acceptance.length > 0;
  const complexity = requirements.length + dependencies.length;

  return {
    requirements, dependencies, constraints, inputs, outputs, acceptance, ambiguities,
    scores: {
      requirements: requirements.length,
      dependencies: dependencies.length,
      clarity: round2(clarity),
      completeness: round2(completeness),
      verifiable,
      complexity,
    },
    residual: src,   // lossless: the original task is kept whole, never rewritten
  };
}

// A compact, human/agent-readable summary of the analysis.
export function taskReport(a) {
  const s = a.scores;
  const lines = [];
  lines.push(`requirements: ${s.requirements}   dependencies: ${s.dependencies}   complexity: ${s.complexity}`);
  lines.push(`clarity: ${(s.clarity * 100).toFixed(0)}%   completeness: ${(s.completeness * 100).toFixed(0)}%   verifiable: ${s.verifiable ? 'yes' : 'NO (no checkable success condition)'}`);
  if (a.ambiguities.length) {
    lines.push(`collapses to undefinable at ${a.ambiguities.length} point(s):`);
    for (const v of a.ambiguities.slice(0, 6)) lines.push(`  "${v.term}"  ->  ${v.context}`);
  } else {
    lines.push('no undefinable terms detected.');
  }
  return lines.join('\n');
}
