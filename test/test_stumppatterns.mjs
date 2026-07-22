// Receipts for the Handshake stump-pattern evaluator. It must reproduce the platform's own rulings
// and our measured outcomes, and give a clean verdict on the counting design.
import { PATTERNS, classify, solverExposure, SOLVER_MOVES } from '../src/stumppatterns.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

console.log('\n== the nine patterns are encoded with the disclosure law ==');
ok(Object.keys(PATTERNS).join('') === 'ABCDEFGHI', 'all nine patterns A..I present');
ok(PATTERNS.A.platformRank.includes('most common'), 'A is flagged the platform\'s most effective stump');
ok(PATTERNS.D.robustToDisclosure === true, 'D (fit-trap) is the robust one: survives disclosure');
ok(PATTERNS.A.robustToDisclosure === false, 'A (latent crux) is delicate: evaporates on disclosure');

console.log('\n== it reproduces the measured fit-trap outcomes ==');
// 322c849 / bbb74dc: fit-trap, accepted. Robust, fair, no self-check.
const fitTrap = classify({ pattern: 'D', decidingFactInData: true, sampleExercisesCrux: false, selfCheckRevealsCrux: false });
ok(fitTrap.verdict === 'STUMPS' && fitTrap.durability === 'ROBUST',
  `fit-trap -> ${fitTrap.verdict} (${fitTrap.durability}), matches the 3 accepted fit-trap tasks`);
ok(fitTrap.confidence.includes('high'), '  confidence high, because it survives disclosure');

console.log('\n== it reproduces the CDC failure: full disclosure = transcription ==');
// The CDC task disclosed every rule; the sample exercised them. Delicate + sample-exercises -> easy.
const cdc = classify({ pattern: 'A', decidingFactInData: true, sampleExercisesCrux: true, selfCheckRevealsCrux: false });
ok(cdc.verdict === 'TOO EASY',
  `CDC (disclosed rule, sample exercises it) -> ${cdc.verdict}, matches its measured failure`);

console.log('\n== the counting task: the platform framing agrees with our oracle finding ==');
// Pattern B-ish: reflex ~= correct, byte-identical wrong answer. But the reflex is wrong at N=2, so
// brute-forcing a small instance (a listed solver move) reveals the crux for free.
const counting = classify({
  pattern: 'B', decidingFactInData: true, sampleExercisesCrux: false,
  selfCheckRevealsCrux: true, selfCheckMove: 'brute-force small N and compare',
});
ok(counting.verdict === 'TOO EASY' && counting.durability === 'DELICATE',
  `counting task -> ${counting.verdict} (${counting.durability}): defeated by brute-force-small`);
ok(counting.why.includes('brute-force small'), '  and it names the exact solver move that beats it');

const expo = solverExposure({ selfCheckRevealsCrux: true });
ok(!expo.durable && expo.exposedTo.some((m) => m.includes('brute-force')),
  'solver exposure confirms it does not defend against brute-force-small');

console.log('\n== the fix: same crux, invisible at brute-forceable sizes, becomes durable ==');
// If the divergence appears only past the enumeration ceiling, the brute-force move no longer reveals it.
const countingFixed = classify({
  pattern: 'B', decidingFactInData: true, sampleExercisesCrux: false, selfCheckRevealsCrux: false,
});
ok(countingFixed.verdict === 'STUMPS',
  `same design with the crux invisible at small N -> ${countingFixed.verdict}: the redesign target`);

console.log('\n== unfair designs are called defects, not hard tasks ==');
const unfair = classify({ pattern: 'F', decidingFactInData: false });
ok(unfair.verdict === 'UNFAIR' && unfair.why.includes('unstated rule'),
  'a deciding value not in readable data -> UNFAIR (rejection reason 1), not a stump');

console.log('\n== robust designs defeat every listed solver move ==');
const robust = solverExposure({ selfCheckRevealsCrux: false, sampleExercisesCrux: false });
ok(robust.durable && robust.defends.length === SOLVER_MOVES.length,
  'a design exposed to no solver move is durable');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
