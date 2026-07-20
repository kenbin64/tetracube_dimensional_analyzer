// test_policy.mjs — the file-type guard + adoption bar. Encodes the rules we established:
// block "no effect" (opaque binary) and "makes it worse" (order-sensitive rewrite), DECODE media
// instead of skipping it, and adopt ONLY when the win over the status-quo codec is dramatic.
// Run: node dimensional-analyzer/test/test_policy.mjs
import { classify, adopt, skipByContent } from '../src/policy.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };

console.log('\n== "makes it worse": order-sensitive source is report-only, never auto-rewritten ==');
ok(classify('fasttrack/3d.css').action === 'report', 'CSS -> report only (cascade is order-sensitive; the rewrite broke it)');
ok(classify('app.js').action === 'report' && classify('main.py').action === 'report', 'JS and Python -> report only (order/scope/indentation)');
ok(classify('index.html').action === 'report', 'HTML -> report only (order and nesting matter)');

console.log('\n== "no effect": opaque binaries are skipped, but MEDIA is decoded, not skipped ==');
ok(classify('font.woff2').action === 'skip' && classify('app.wasm').action === 'skip', 'fonts and wasm -> skip (opaque, nothing to act on)');
ok(classify('photo.png').action === 'decode' && classify('pic.jpg').action === 'decode', 'PNG and JPG -> DECODE (structure is in the pixels, not the container): the image fix');
ok(classify('clip.mp4').action === 'decode' && classify('song.wav').action === 'decode', 'video and audio -> decode (frames/samples have structure)');
ok(classify('bundle.tar.gz').action === 'decompress' || classify('data.gz').action === 'decompress', 'archives -> decompress and recurse (the container itself is ~1.0x)');

console.log('\n== the content gate: no measured structure means skip regardless of type ==');
ok(skipByContent(0.01).skip === true, 'structure ~1% -> skip (Procrustean guard: do not force structure onto flat data)');
ok(skipByContent(0.7).skip === false, 'structure 70% -> proceed');

console.log('\n== THE ADOPTION BAR: beat the status quo by a wide margin, or the incumbent wins ==');
ok(adopt(100, 1000).adopt === true && adopt(100, 1000).verdict === 'dramatic', '10x smaller than status quo -> dramatic, adopt');
ok(adopt(400, 1000).adopt === true, '2.5x smaller -> worth adopting');
ok(adopt(950, 1000).adopt === false && adopt(950, 1000).verdict === 'status-quo-wins', 'only 1.05x -> status quo wins, do NOT switch (a marginal win is not worth it)');
ok(adopt(1000, 1000).adopt === false, 'a tie -> keep the incumbent (no reason to adopt)');

console.log('\n== the reasons carry the WHY, not just a verdict ==');
ok(/order-sensitive|cascade/.test(classify('x.css').reason), 'the CSS block says WHY (cascade/order-sensitive)');
ok(/pixels|decoded|residual/i.test(classify('x.png').reason), 'the image reason explains decode-first + rule/residual');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
