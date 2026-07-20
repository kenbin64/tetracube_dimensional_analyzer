// test_registry.mjs: the maintained rule registry (PRIMER: "maintain the rule to rebuild").
// A seed stamps (rule, version) and blooms by looking the rule UP, so it stays lossless even as pure
// JSON with no live rule reference, and even after newer rule versions are registered. A seed whose
// rule is missing throws loudly instead of silently corrupting: the burned log names itself.
// Run: node dimensional-analyzer/test/test_registry.mjs
import { seed, bloom, fibRule, register, shaSeq } from '../src/seedbloom.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };

console.log('\n== the seed carries a rule STAMP, not the rule itself ==');
const fib = [0, 1, 1, 2, 3, 5, 8, 13, 21];
const s = seed(fib, fibRule);
ok(s.rule === 'sum-last-2' && s.version === 1, 'the seed is stamped with the rule name and version');
ok(shaSeq(bloom(s)) === shaSeq(fib), 'bloom resolves the rule from the registry and round-trips lossless');

console.log('\n== durability: a detached seed (pure JSON) still blooms via the registry ==');
const detached = JSON.parse(JSON.stringify(s));   // no live rule reference at all
ok(shaSeq(bloom(detached)) === shaSeq(fib), 'a detached seed blooms via the registry (the rule is maintained, not carried)');

console.log('\n== immutable versions: registering a v2 does not disturb v1 seeds ==');
register({ name: 'sum-last-2', version: 2, order: 2, predict: (p) => p[p.length - 1] + p[p.length - 2] + 1 });  // a DIFFERENT rule, same name, v2
ok(shaSeq(bloom(detached)) === shaSeq(fib), 'after a different v2 is registered, the v1 seed STILL blooms to the original');

console.log('\n== the burned log: a missing rule@version throws, it does not silently lie ==');
let threw = false;
try { bloom({ ...detached, version: 99 }); } catch (e) { threw = /not in registry/.test(e.message); }
ok(threw, 'a seed referencing a missing rule@version throws a clear error (the log is burned, and says so)');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
