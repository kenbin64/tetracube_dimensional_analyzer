// capsule.mjs — the self-describing, self-verifying storage unit (the GEP manifest). Security is not a
// wrapper here, it is the header: every capsule carries its own integrity receipt and provenance, so it
// needs no external system to know what it is or whether it is intact.
//
// Manifest fields (exactly the ones we agreed on):
//   sha256         - hash of the ORIGINAL bytes. Reconstruction must reproduce it, or the capsule is
//                    rejected. Any tamper of the body, the residual, or the rule breaks it. Integrity,
//                    baked in, not bolted on.
//   originalBits   - size before, in bits.
//   compressedBits - size after (our encoded body), in bits. originalBits vs compressedBits IS the win,
//                    readable straight off the manifest for the adoption bar. No re-measuring, no spin.
//   name, type     - provenance: rebuild to the right file, and route the decoder by original type.
//
// HONEST FLOOR: sha256 gives INTEGRITY and tamper-evidence, NOT confidentiality. It proves the bytes are
// unchanged; it does not hide them. Secret data still needs real encryption (a standard, bounded layer,
// never DIY crypto). "Baked in" means the model is secure-shaped so you are not endlessly wrapping an
// insecure core, not that confidentiality comes for free.
import crypto from 'crypto';
import { classify } from './policy.mjs';

export const sha256Bytes = (bytes) => crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');

// Pack an encoded body into a capsule. originalBytes = the source; encodedByteLen = the serialized size
// of the body (the real compressed bitcount comes from this); body = whatever reconstructs the original.
export function pack(name, originalBytes, encodedByteLen, body) {
  const ext = (/\.([a-z0-9]+)$/i.exec(name) || [, ''])[1].toLowerCase();
  return {
    v: 1,
    name,
    type: ext || '(none)',
    category: classify(name).category,
    originalBits: originalBytes.length * 8,
    compressedBits: encodedByteLen * 8,
    sha256: sha256Bytes(originalBytes),
    body,
  };
}

// Verify a reconstruction against the capsule's receipt. Lossless AND untampered iff the sha256 matches.
// This is the one gate that must pass before any capsule is trusted or written back to a file.
export function verify(capsule, reconstructedBytes) {
  const got = sha256Bytes(reconstructedBytes);
  if (got !== capsule.sha256) {
    return { ok: false, reason: `sha256 mismatch: corrupted, tampered, or a lossy encode. expected ${capsule.sha256.slice(0, 12)}..., got ${got.slice(0, 12)}...` };
  }
  return { ok: true, reason: 'sha256 matches: reconstruction is byte-identical (lossless and untampered).' };
}

// The win, straight off the manifest (compression ratio vs the original). For the ADOPTION decision,
// compare compressedBits against the STATUS-QUO codec, not against originalBits (see policy.adopt).
export const ratio = (c) => c.originalBits / c.compressedBits;
