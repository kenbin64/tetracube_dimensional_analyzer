// Receipts for the task manifold. It is software, so the verdict is deterministic and reproducible:
// same task in, same verdict out, with the reason attached. No model is asked for an opinion.
import { MEASURED, derive, verify, judge, unobserved, AXES } from '../src/taskmanifold.mjs';

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  PASS ' + msg); } else { fail++; console.log('  FAIL ' + msg); } };

console.log('\n== it reproduces every outcome we actually measured ==');
const v = verify();
ok(v.ok, `reproduces all ${v.checked} measured outcomes, or it does not get to speak (${v.why || 'clean'})`);
for (const m of MEASURED) {
  const got = derive(m.at);
  ok(got && got.stumps === m.stumps,
    `${m.task}: measured ${m.outcome}, manifold says ${got?.stumps ? 'STUMPS' : 'TOO EASY'}`);
}

console.log('\n== deterministic: it is software, not a judgement call ==');
const design = { oracleGuidesSearch: false, frameGiven: false, reflexConfidentlyWrong: true, smoothCrux: false };
const runs = Array.from({ length: 50 }, () => JSON.stringify(judge(design)));
ok(new Set(runs).size === 1, `50 runs of the same design give exactly 1 distinct verdict (${new Set(runs).size})`);

console.log('\n== the verdict comes with its reason ==');
const good = judge(design);
ok(good.grounded && good.verdict === 'STUMPS', `a no-oracle, no-frame design: ${good.verdict}`);
ok(good.because.includes('frame'), '  because: ' + good.because);

const oracled = judge({ oracleGuidesSearch: true, frameGiven: false, reflexConfidentlyWrong: true, smoothCrux: false });
ok(oracled.verdict === 'TOO EASY', `hand the agent a local oracle and it is ${oracled.verdict}`);
ok(oracled.because.includes('narrows the search'),
  '  because: ' + oracled.because);

const smooth = judge({ oracleGuidesSearch: false, frameGiven: false, reflexConfidentlyWrong: true, smoothCrux: true });
ok(smooth.verdict === 'TOO EASY', `make the crux smooth and it is ${smooth.verdict} even with everything else right`);

console.log('\n== it refuses where nothing has been measured ==');
const never = judge({ oracleGuidesSearch: false, frameGiven: true, reflexConfidentlyWrong: false, smoothCrux: false });
ok(!never.grounded && never.verdict === null,
  'an unmeasured corner returns no verdict rather than a guess: ' + never.why);

const gaps = unobserved();
ok(gaps.length > 0, `${gaps.length} of 16 corners of the space have never been built`);
const undecidable = gaps.filter((g) => g.derives === null);
ok(undecidable.length > 0,
  `${undecidable.length} corner(s) the manifold cannot even derive: those are the ones worth building`);

console.log('\n== the axes are named, so a task can be scored before it is built ==');
ok(Object.keys(AXES).length === 4, `${Object.keys(AXES).length} axes, each with a stated meaning`);
ok(AXES.oracleGuidesSearch.includes('NARROW'), 'oracleGuidesSearch: ' + AXES.oracleGuidesSearch.slice(0, 60) + '...');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
