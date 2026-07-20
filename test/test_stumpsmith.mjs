// Receipts for stumpsmith: the scorer must agree with what our real tasks did in the pipeline.
// Run: node test/test_stumpsmith.mjs
import { stumpScore, proposeStumps, adversaryPrompt, stumpReport, CREASES } from '../src/index.mjs';
import assert from 'node:assert';

let pass = 0;
const ok = (name, cond) => { assert.ok(cond, name); console.log('  ok  ' + name); pass++; };

console.log('stumpsmith receipts');

// 1. The quantized-layer task (f70cc24): clip + round + verifier-held truth + exact bar, float reflex.
//    It is a real stump by our rule. Should score 5/5 -> verdict "stump".
const quantized = stumpScore({
  forwardMap: 'y = clip(round((W.x + b) / D), 0, 255) with hidden integer W, b, and scale D',
  reflex: 'fit a floating-point linear model and round it',
  reflexIsCheap: true,
  exactBar: true,
  verifierHoldsTruth: true,
  selfVerifiable: false,
  canonicalSolver: false,
});
ok('quantized layer scores a full stump', quantized.verdict === 'stump' && quantized.score === 5);
ok('quantized layer detects fold + staircase creases',
  quantized.creases.includes('fold') && quantized.creases.includes('staircase'));

// 2. A symmetric task: fully specified rule, no crease, tolerance grading, agent can self-check.
//    Our SYMMETRY LAW says this will not reliably stump. Should NOT be a stump.
const symmetric = stumpScore({
  forwardMap: 'sum the input list and return the total',
  reflex: 'sum the list',
  exactBar: false,
  verifierHoldsTruth: false,
  selfVerifiable: true,
  canonicalSolver: true,
});
ok('symmetric counting task is not a stump', symmetric.verdict !== 'stump');
ok('symmetric task lists the missing invariants', symmetric.missing.length >= 3);

// 3. A leaky task: has a crease and exact bar, but the agent can self-verify (the classic hole).
//    This is the crypto g^x==y lesson: recovery is real work but self-checkable, so it does not stump.
const leaky = stumpScore({
  forwardMap: 'y = g^x mod p, recover x',
  reflex: 'baby-step giant-step / index calculus',
  exactBar: true,
  verifierHoldsTruth: true,
  selfVerifiable: true,     // agent recomputes g^x and confirms -> self-verifiable
  canonicalSolver: true,
});
ok('self-verifiable crypto recovery does not reach full stump', leaky.verdict !== 'stump');
ok('leaky task flags the self-verify hole in fixes',
  leaky.fixes.some((f) => f.toLowerCase().includes('self')));

// 4. proposeStumps ranks crease-based seeds; a fold+staircase forward map surfaces those creases first.
const seeds = proposeStumps({
  domain: 'edge-deployed model inference',
  forwardMap: 'clip and round an integer accumulation to a byte',
});
ok('proposeStumps returns ranked seeds', Array.isArray(seeds) && seeds.length > 0);
ok('top seed is a full-score stump', seeds[0].score === 5 && seeds[0].verdict === 'stump');
ok('seeds carry the reflex they defeat', seeds.every((s) => typeof s.defeatsReflex === 'string' && s.defeatsReflex.length));

// 5. The AI-ideation prompt asks the two gating questions and lists the crease vocabulary.
const prompt = adversaryPrompt({ domain: 'ETL validation', forwardMap: 'a record-acceptance rule' });
ok('adversary prompt asks the reflex question', /reaches for first/.test(prompt));
ok('adversary prompt asks the self-verify question', /NOT check about its own output/.test(prompt));
ok('adversary prompt enumerates the creases', CREASES.every((c) => prompt.includes(c.name)));

// 6. stumpReport renders without throwing and states the verdict.
const rep = stumpReport(quantized === undefined ? {} : {
  forwardMap: 'clip(round(x))', reflex: 'float fit', exactBar: true,
  verifierHoldsTruth: true, selfVerifiable: false,
});
ok('stumpReport renders a verdict line', /stump verdict:/i.test(rep));

console.log('\n' + pass + ' checks passed');
