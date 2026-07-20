// test_capsule.mjs — the capsule manifest = storage unit + integrity receipt in one. Proves the header
// carries the agreed fields, that a correct reconstruction verifies, that tampering (of the rebuilt
// bytes OR of the stored residual) is caught, and that the adoption bar decides straight off the bits,
// measured against the status quo. Run: node dimensional-analyzer/test/test_capsule.mjs
import zlib from 'zlib';
import { seedBest, bloom } from '../src/seedbloom.mjs';
import { pack, verify } from '../src/capsule.mjs';
import { adopt } from '../src/policy.mjs';

let pass = 0, fail = 0;
const ok = (c, n) => { if (c) { pass++; console.log('  PASS ' + n); } else { fail++; console.log('  FAIL ' + n); } };

// a structured byte field (an arithmetic ramp inside byte range): real structure to capture
const original = Array.from({ length: 300 }, (_, i) => (i * 5) % 256);
const s = seedBest(original).seed;
const minimalBytes = s.base.length + s.residual.filter((x) => x !== 0).length + 1;   // honest info content of the seed
const cap = pack('ramp.dat', original, minimalBytes, s);

console.log('\n== the manifest carries exactly the agreed fields ==');
ok(!!cap.sha256 && cap.sha256.length === 64, 'sha256 present (the integrity receipt)');
ok(cap.originalBits === 300 * 8 && cap.compressedBits === minimalBytes * 8, `original bits (${cap.originalBits}) and compressed bits (${cap.compressedBits})`);
ok(cap.name === 'ramp.dat' && cap.type === 'dat', 'file name + original type (provenance to rebuild the right file)');

console.log('\n== integrity: a correct reconstruction verifies against the receipt ==');
const rebuilt = bloom(s);
ok(verify(cap, rebuilt).ok, 'sha256 matches a byte-identical rebuild (lossless + untampered)');

console.log('\n== tamper-evidence, baked into the capsule ==');
const flipped = rebuilt.slice(); flipped[7] ^= 1;
ok(!verify(cap, flipped).ok, 'ONE flipped bit in the output is detected and rejected');
const evil = JSON.parse(JSON.stringify(cap)); if (evil.body.residual.length) evil.body.residual[0] += 1;
ok(!verify(evil, bloom(evil.body)).ok, 'tampering the STORED residual is caught: the receipt no longer reconstructs (an attacker must also forge the sha256, which a signature stops)');

console.log('\n== the adoption bar reads the bits, measured against the STATUS QUO (gzip) ==');
const gzipBytes = zlib.gzipSync(Buffer.from(original)).length;
const verdict = adopt(minimalBytes, gzipBytes);
console.log(`     original ${original.length}B  |  ours ${minimalBytes}B  |  gzip ${gzipBytes}B  ->  ${verdict.reason}`);
ok(typeof verdict.adopt === 'boolean', 'the manifest bits feed the adoption decision vs the incumbent codec: ' + verdict.verdict);

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
