// test_taskanalyzer.mjs — the receipt for the non-AI task-description analyzer. The tasks it reads are
// adversarial (built to stymie AI), so the analysis must be DETERMINISTIC: same task in, same reading
// out, every time, with no model in the loop. It also has to tell a clean, verifiable task apart from a
// vague one that collapses into the undefinable, and it must never rewrite the task (lossless residual).
// Run: node test/test_taskanalyzer.mjs
import { analyzeTask, taskReport } from '../src/taskanalyzer.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };

const clean = `Write a command-line tool that reads integers from stdin, one per line.
- Sort them in ascending order.
- Then print the median to stdout.
- If the input is empty, exit with code 1.
The tool must not use more than 64 MB of memory. Tests verify the exact stdout for three fixed inputs.`;

const vague = `Make the parser better and handle edge cases appropriately.
It should be robust and efficient. Add some validation as needed and clean up the code.
Figure out the right output format, etc.`;

const A = analyzeTask(clean), B = analyzeTask(vague);

console.log('\n== deterministic: no model, so the same task always reads the same (this is the point) ==');
ok(JSON.stringify(analyzeTask(clean)) === JSON.stringify(A), 'analyzing the same task twice gives byte-identical output');
ok(JSON.stringify(analyzeTask(vague)) === JSON.stringify(B), 'the vague task, too, reads identically every run');

console.log('\n== it reads the STRUCTURE of a task ==');
ok(A.scores.requirements >= 4, `found the requirements in the clean task (${A.scores.requirements})`);
ok(A.dependencies.length >= 1, `found an ordered dependency ("Then print ...") (${A.dependencies.length})`);
ok(A.inputs.length >= 1 && A.outputs.length >= 1 && A.constraints.length >= 1, 'found inputs (stdin), outputs (stdout), and a constraint (memory limit)');

console.log('\n== verifiable vs not: can an AI even be scored on this? ==');
ok(A.scores.verifiable === true, 'clean task is VERIFIABLE (it states how success is checked: exact stdout, tests)');
ok(B.scores.verifiable === false, 'vague task is NOT verifiable (no checkable success condition), so it would stymie a grader');
ok(analyzeTask('Read /app/in.json; write /app/out.json. Your output must match the reference exactly on a held-out set.').scores.verifiable === true, 'exact-match / held-out grading is recognized as a checkable success condition');

console.log('\n== the collapse: where the spec goes undefinable ==');
ok(B.ambiguities.length >= 5, `flagged the undefinable terms in the vague task (${B.ambiguities.length}: e.g. ${B.ambiguities.slice(0, 3).map((v) => '"' + v.term + '"').join(', ')})`);
ok(A.ambiguities.length <= 1, `the clean task barely collapses (${A.ambiguities.length})`);
ok(B.scores.clarity < A.scores.clarity, `clarity ranks the clean task higher (${A.scores.clarity} vs ${B.scores.clarity})`);
ok(B.scores.completeness < A.scores.completeness, `completeness ranks the clean task higher (${A.scores.completeness} vs ${B.scores.completeness})`);

console.log('\n== lossless: the task is never rewritten, only read ==');
ok(A.residual === clean && B.residual === vague, 'the original task text is kept whole as the residual');

console.log('\n----- report for the vague task (what an agent would receive) -----\n' + taskReport(B).split('\n').map((l) => '  ' + l).join('\n'));

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
