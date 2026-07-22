// Receipts: every category maps to a durable stump pattern, and the ranking rewards range.
import { CATEGORY_STUMPS, howToStump, rankForDiversity } from '../src/categorystumps.mjs';
import { PATTERNS } from '../src/stumppatterns.mjs';

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  PASS ' + m); } else { fail++; console.log('  FAIL ' + m); } };

console.log('\n== no category is unstumpable: each maps to a real A..I pattern ==');
const cats = Object.keys(CATEGORY_STUMPS);
ok(cats.length === 10, `all ten open slots are mapped (${cats.length})`);
for (const [cat, c] of Object.entries(CATEGORY_STUMPS)) {
  const allReal = c.durableVia.every((p) => PATTERNS[p]);
  ok(allReal && c.durableVia.length > 0, `${cat}: durable via ${c.durableVia.join('/')}`);
}

console.log('\n== each mapping names the lazy trap that made it look "too easy" ==');
const nlp = howToStump('NLP and language models');
ok(nlp.lazyDefault.includes('statistical') && nlp.durableVia.includes('D'),
  'NLP: lazy default is "fit an LM", durable via the fit-trap (formal automaton)');
ok(nlp.robust.startsWith('high'), '  and that path is robust AND adds range (not the finite-field engine)');

console.log('\n== the diversity ranking rewards robust + fresh mechanism over the overused fit-trap ==');
const ranked = rankForDiversity(new Set(['D']));   // D = finite-field fit-trap, heavily used
ok(ranked.length === 10, 'all ten ranked');
const top = ranked[0];
ok(!top.durableVia.includes('D') || top.durableVia.length > 1,
  `top pick avoids leaning only on the overused pattern: ${top.category} via ${top.durableVia.join('/')}`);
const symbolic = ranked.find((r) => r.category === 'Symbolic computation');
const access = ranked.find((r) => r.category === 'Users Permission and Access control');
ok(access.score >= symbolic.score,
  'a robust NEW-pattern category (access control / coupling) ranks at least as high as the overused symbolic fit-trap');

console.log('\n== it is honest about the weak and delicate slots ==');
ok(howToStump('Fine tuning').robust.startsWith('low'), 'Fine tuning is flagged the weakest slot');
ok(howToStump('Experiment and metrics analysis').robust.startsWith('delicate'),
  'metrics analysis is flagged delicate, not robust');
ok(howToStump('Symbolic computation').robust.includes('over-used'),
  'symbolic is flagged over-used despite being robust');

console.log('\n== an unknown category says so rather than guessing ==');
ok(!howToStump('Underwater Basket Weaving').known, 'an unmapped category returns known:false');

console.log(`\n======================\n  ${pass} passed, ${fail} failed\n======================\n`);
process.exit(fail ? 1 : 0);
