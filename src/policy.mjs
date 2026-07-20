// policy.mjs — the file-type guard. Before the analyzer touches anything it decides what it is ALLOWED
// to do, so it never wastes effort where there is nothing to gain and never rewrites something it would
// break. Two block reasons, both learned the hard way:
//   "no effect"      -> already-compressed or binary input reads ~1.0x; there is no structure to exploit.
//   "makes it worse" -> the format is order/whitespace/cascade sensitive, so an auto-rewrite can change
//                       behavior even when it looks equivalent (CSS proved this: a reorganize that looked
//                       38% smaller failed computed-style verification with 34 real differences).
//
// Three actions:
//   skip      : do nothing (no report, no transform). Binary, compressed, media.
//   report    : read-only analysis is safe; auto-transform is BLOCKED. Stylesheets, code, markup, prose.
//   transform : safe to auto-reorganize losslessly. Reserved: a type earns this only once a
//               verified-lossless transformer exists for it. Nothing is here yet, and that is honest.

const EXT = (name) => { const m = /\.([a-z0-9]+)$/i.exec(name.toLowerCase()); return m ? m[1] : ''; };

// media: the compressed FILE reads ~1.0x, but the DECODED field (pixels, samples, frames) has real
// structure. DECODE first, then rule = the smooth base (shading/gradients, the low-frequency field),
// residual = the detail (edges, lines, textures, transients, the high-frequency field). Lossless when
// the full residual is kept; the win scales with how smooth/structured the content is (flat, gradient,
// and geometric content reduces dramatically; noise and already-optimal photos approach 1.0x). This is
// NOT skip: skipping images was the mistake. It is a real transform target at the decoded granularity.
const DECODE_EXT = {
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', bmp: 'image', avif: 'image', tiff: 'image',
  mp4: 'video', webm: 'video', mov: 'video', avi: 'video', mkv: 'video',
  mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio', m4a: 'audio',
};

// archives: the container is ~1.0x; decompress and recurse into the contents (structure is inside).
const DECOMPRESS_EXT = new Set(['gz', 'zip', 'br', '7z', 'rar', 'xz', 'bz2', 'zst', 'tar', 'tgz']);

// opaque: a format with no decoder we use and no structure we can act on. Genuinely skip.
const SKIP_EXT = new Set([
  'woff', 'woff2', 'ttf', 'otf', 'eot',                         // fonts
  'exe', 'dll', 'so', 'dylib', 'wasm', 'bin', 'o', 'a',         // binaries
  'class', 'pyc', 'jar', 'db', 'sqlite', 'pdf', 'ico',
]);

// order / whitespace / cascade sensitive: report is fine, auto-rewrite can change behavior. REPORT ONLY.
const REPORT_EXT = {
  css: 'stylesheet: the cascade is order-sensitive, so an auto-rewrite can change behavior (verified: 34 computed-style diffs on 3d.css). Report and hand-apply only.',
  scss: 'stylesheet (Sass): cascade + nesting are order-sensitive. Report only.',
  less: 'stylesheet (Less): cascade is order-sensitive. Report only.',
  js: 'source code: behavior depends on order, scope, and side effects. A structural report is safe; auto-rewrite is not.',
  mjs: 'source code: order/scope/side-effects. Report only.',
  cjs: 'source code: order/scope/side-effects. Report only.',
  ts: 'source code: order/scope/side-effects. Report only.',
  tsx: 'source code (JSX): order/scope/side-effects. Report only.',
  jsx: 'source code (JSX): order/scope/side-effects. Report only.',
  java: 'source code: order/scope/side-effects. Report only.',
  c: 'source code: order/scope/side-effects. Report only.',
  cpp: 'source code: order/scope/side-effects. Report only.',
  h: 'source code: order/scope/side-effects. Report only.',
  go: 'source code: order/scope/side-effects. Report only.',
  rs: 'source code: order/scope/side-effects. Report only.',
  rb: 'source code: order/scope/side-effects. Report only.',
  php: 'source code: order/scope/side-effects. Report only.',
  sql: 'query text: statement order and side-effects matter. Report only.',
  py: 'whitespace-significant: indentation carries meaning, so auto-reformat can change semantics. Report only.',
  yaml: 'whitespace-significant: indentation is structural. Report only.',
  yml: 'whitespace-significant: indentation is structural. Report only.',
  html: 'markup: element order and nesting are meaningful. Report only.',
  xml: 'markup: order and nesting are meaningful. Report only.',
  svg: 'markup: order and nesting are meaningful. Report only.',
  md: 'prose: reads ~1.0x through structural rules; a report adds little, a rewrite risks meaning. Report only.',
  txt: 'prose: reads ~1.0x through structural rules. Report only.',
};

// structured data: safe to report and to dedupe shared subtrees, but array/row order is meaningful,
// so a full reorder is blocked. REPORT ONLY for now (dedupe is a separate, verified operation).
const DATA_EXT = new Set(['json', 'ndjson', 'csv', 'tsv', 'jsonl']);

export function classify(name) {
  const ext = EXT(name);
  const base = name.toLowerCase();
  if (/\.min\.(js|css)$/.test(base)) return { ext, category: 'minified', action: 'skip', reason: 'already minified: dense, no structure to gain and risky to rewrite.' };
  if (/(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(base)) return { ext, category: 'lockfile', action: 'skip', reason: 'machine-generated lockfile: do not touch.' };
  if (ext in DECODE_EXT) return { ext, category: DECODE_EXT[ext], action: 'decode', reason: `${DECODE_EXT[ext]}: the compressed file reads ~1.0x, but the DECODED field has real structure. Decode first, then rule = the smooth base, residual = the detail (edges/textures/transients). Lossless if the full residual is kept; the win scales with how smooth/structured the content is (flat/gradient/geometric wins big, noise approaches 1.0x).` };
  if (DECOMPRESS_EXT.has(ext)) return { ext, category: 'archive', action: 'decompress', reason: 'archive: the container reads ~1.0x; decompress and recurse into the contents (the structure is inside).' };
  if (SKIP_EXT.has(ext)) return { ext, category: 'binary', action: 'skip', reason: 'opaque binary: no decoder we use and no structure to act on. Skip.' };
  if (ext in REPORT_EXT) return { ext, category: 'source', action: 'report', reason: REPORT_EXT[ext] };
  if (DATA_EXT.has(ext)) return { ext, category: 'data', action: 'report', reason: 'structured data: report and dedupe are safe; array/row order is meaningful, so full reorder is blocked.' };
  return { ext: ext || '(none)', category: 'unknown', action: 'report', reason: 'unknown type: default to read-only report; never auto-rewrite an unrecognized format.' };
}

// Content gate: even an allowed file with no measured structure should be skipped (the Procrustean guard).
// Pass the analyzer's structure score (0..1); below the floor there is nothing to organize.
export function skipByContent(structureScore, floor = 0.05) {
  if (structureScore < floor) return { skip: true, reason: `measured structure ~${(structureScore * 100).toFixed(0)}%: effectively 1.0x, nothing to organize.` };
  return { skip: false };
}

// THE ADOPTION BAR. The dimensional encoding must beat the STATUS-QUO codec (gzip, PNG, JPEG, ...) by a
// wide margin, or there is no reason to switch: the incumbent wins by default, and a marginal improvement
// is not worth the complexity, the risk, or the second implementation to maintain. Always measure against
// what the current tool already achieves, never against raw, or you flatter yourself with a fake win.
export function adopt(dimBytes, statusQuoBytes, { impressive = 2, dramatic = 5 } = {}) {
  const ratio = statusQuoBytes / dimBytes;   // > 1 means the dimensional result is the smaller one
  if (!(dimBytes > 0) || !(statusQuoBytes > 0)) return { verdict: 'unknown', adopt: false, ratio: 0, reason: 'missing a size to compare; measure both before deciding.' };
  if (ratio >= dramatic) return { verdict: 'dramatic', adopt: true, ratio, reason: `${ratio.toFixed(1)}x smaller than the status quo: adopt.` };
  if (ratio >= impressive) return { verdict: 'adopt', adopt: true, ratio, reason: `${ratio.toFixed(1)}x smaller than the status quo: worth adopting.` };
  return { verdict: 'status-quo-wins', adopt: false, ratio, reason: `only ${ratio.toFixed(2)}x vs the status quo: not worth switching, keep the incumbent.` };
}
