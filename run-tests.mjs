// run-tests.mjs: the single command that proves the whole analyzer. Runs every receipt in test/,
// totals the green checks, and exits nonzero if any receipt fails. This is the "run it yourself" the
// README points at: no framework, no network, just node executing the proofs.
import { readdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const testDir = join(here, 'test');
const files = readdirSync(testDir).filter((f) => f.endsWith('.mjs')).sort();

let total = 0, failed = 0, filesFailed = 0;
console.log('\n  Dimensional Analyzer: full receipt run\n  ' + '='.repeat(50));
for (const f of files) {
  const r = spawnSync(process.execPath, [join(testDir, f)], { encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  const m = out.match(/(\d+) passed, (\d+) failed/);
  const p = m ? +m[1] : 0, fl = m ? +m[2] : 0;
  total += p; failed += fl;
  const bad = r.status !== 0 || fl > 0;
  if (bad) filesFailed++;
  console.log(`  ${bad ? 'FAIL' : 'OK  '} ${f.padEnd(30)} ${p} passed${fl ? ', ' + fl + ' failed' : ''}`);
}
console.log('  ' + '='.repeat(50));
console.log(`  ${total} green checks across ${files.length} receipts, ${failed} failed`);
console.log('  ' + (filesFailed ? filesFailed + ' receipt file(s) failed' : 'every receipt passed') + '\n');
process.exit(filesFailed ? 1 : 0);
