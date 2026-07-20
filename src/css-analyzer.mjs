// css-analyzer.mjs — the "pure analyzer" mode of the dimensional analyzer, applied to source.
// A stylesheet is a set of (selector = address, declarations = surface) points, and the cascade is
// an override graph over them. This reads a real .css file and reports its STRUCTURAL efficiency:
// duplicate selectors, provably-dead declarations, !important density, and a redundancy ratio.
//
// HONEST SCOPE. It proves a declaration dead only WITHIN one selector+media context: same selector
// string means same specificity, so for any single property exactly one declaration wins (an
// !important beats a non-important; among equals, the last in source order wins) and every other
// setting of that property is overridden, i.e. it never reaches the output. It does NOT model
// cross-selector specificity, DOM matching, or shorthand/longhand expansion (margin vs margin-top);
// those need a full cascade solver and are called out, not silently assumed. It measures STRUCTURE,
// never runtime speed (the lens makes no speed claim). Removing a dead declaration is lossless by
// construction: it had no effect to lose.

export function stripComments(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ''); }

// Parse a stylesheet into flat rules: { media, selector, decls[], raw }. One level of @media/@supports
// nesting is tracked as a context prefix (all this file needs). Declarations never contain braces, so
// a rule body is read straight to its closing brace.
// Returns { rules, atRules }. rules = normal cascading rules (selector, media context, declarations).
// atRules = opaque at-rule blocks (@keyframes, @font-face, ...) whose bodies are NOT cascading rules;
// they are captured verbatim and never parsed as declarations, so keyframe stops (0%, from, to) never
// masquerade as selectors. @media/@supports/@container ARE cascading containers, so their inner rules
// are parsed with the media recorded as context.
const OPAQUE_AT = /^@(-webkit-|-moz-|-o-|-ms-)?(keyframes|font-face|page|property|counter-style|font-feature-values)/i;
const CONTAINER_AT = /^@(media|supports|container|layer)/i;

export function parseRules(cssRaw) {
  const css = stripComments(cssRaw);
  const rules = [], atRules = [];
  const mediaStack = [];
  let i = 0, buf = '';
  while (i < css.length) {
    const c = css[i];
    if (c === '{') {
      const prelude = buf.trim().replace(/\s+/g, ' '); buf = '';
      if (OPAQUE_AT.test(prelude)) {
        let depth = 1, body = ''; i++;
        while (i < css.length && depth > 0) {
          if (css[i] === '{') depth++;
          else if (css[i] === '}') { depth--; if (depth === 0) break; }
          body += css[i]; i++;
        }
        i++; // skip closing '}'
        atRules.push({ raw: prelude + ' {' + body + '}' });
        continue;
      }
      if (CONTAINER_AT.test(prelude)) { mediaStack.push(prelude); i++; continue; }
      let body = ''; i++;
      while (i < css.length && css[i] !== '}') { body += css[i]; i++; }
      i++; // skip '}'
      rules.push({ media: mediaStack.join(' >> '), selector: prelude, decls: parseDecls(body), raw: body });
      continue;
    }
    if (c === '}') { if (mediaStack.length) mediaStack.pop(); buf = ''; i++; continue; }
    buf += c; i++;
  }
  return { rules, atRules };
}

export function parseDecls(body) {
  return body.split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const idx = d.indexOf(':');
    if (idx < 0) return null;
    const prop = d.slice(0, idx).trim().toLowerCase();
    let value = d.slice(idx + 1).trim();
    const important = /!important\s*$/i.test(value);
    value = value.replace(/!important\s*$/i, '').trim();
    if (!prop) return null;
    return { prop, value, important, bytes: d.length + 1 };
  }).filter(Boolean);
}

// Make it dimensional: collapse the file to ONE effective rule per (selector, media context).
// address  = the selector, surface = its winning declarations (the seed), residual = the dead ones
// (dropped). Groups are emitted in each group's LAST-occurrence order, which preserves the cascade
// for equal-specificity selectors (the last one still comes last), so the collapse is behavior-
// preserving where the cascade is decided by specificity/order. Always verify computed styles before
// trusting it on a file whose cascade leans on interleaved source order.
export function reorganize(cssRaw) {
  const { rules, atRules } = parseRules(cssRaw);
  const groups = new Map();
  rules.forEach((r, idx) => {
    const key = r.media + ' || ' + r.selector;
    if (!groups.has(key)) groups.set(key, { media: r.media, selector: r.selector, decls: [], lastIdx: idx });
    const g = groups.get(key); g.decls.push(...r.decls); g.lastIdx = idx;
  });
  for (const g of groups.values()) {
    const order = [], byProp = new Map();
    for (const d of g.decls) {
      if (!byProp.has(d.prop)) { byProp.set(d.prop, d); order.push(d.prop); }
      else { const cur = byProp.get(d.prop); if (d.important || !cur.important) byProp.set(d.prop, d); }  // important beats non; else later wins
    }
    g.effective = order.map((p) => byProp.get(p));
  }
  const fmt = (g, indent) => {
    const pad = indent ? '  ' : '';
    return pad + g.selector + ' {\n' + g.effective.map((d) => pad + '  ' + d.prop + ': ' + d.value + (d.important ? ' !important' : '') + ';').join('\n') + '\n' + pad + '}';
  };
  const all = [...groups.values()];
  const base = all.filter((g) => !g.media).sort((a, b) => a.lastIdx - b.lastIdx);
  const medias = [...new Set(all.filter((g) => g.media).map((g) => g.media))];
  let out = '/* Reorganized by the dimensional pure-analyzer: one effective rule per selector,\n';
  out += '   overridden (dead) declarations dropped. Behavior-preserving where the cascade is\n';
  out += '   decided by specificity/order; verify computed styles before trusting it. */\n\n';
  out += base.map((g) => fmt(g, false)).join('\n\n');
  for (const m of medias) {
    const inner = all.filter((g) => g.media === m).sort((a, b) => a.lastIdx - b.lastIdx);
    out += '\n\n' + m + ' {\n' + inner.map((g) => fmt(g, true)).join('\n\n') + '\n}';
  }
  // opaque at-rules (@keyframes, @font-face) emitted verbatim; they are referenced by name, not by
  // cascade position, so their placement is behavior-neutral.
  if (atRules.length) out += '\n\n' + atRules.map((a) => a.raw).join('\n\n');
  return out + '\n';
}

export function analyze(cssRaw) {
  const { rules } = parseRules(cssRaw);
  const totalDecls = rules.reduce((n, r) => n + r.decls.length, 0);
  const importantCount = rules.reduce((n, r) => n + r.decls.filter((d) => d.important).length, 0);

  // group by exact (media + selector): same specificity, so the cascade is pure last-/important-wins
  const groups = new Map();
  for (const r of rules) {
    const key = r.media + ' || ' + r.selector;
    if (!groups.has(key)) groups.set(key, { media: r.media, selector: r.selector, rules: [] });
    groups.get(key).rules.push(r);
  }

  // duplicate selectors: same selector STRING defined by more than one rule (ignoring media context)
  const bySelector = new Map();
  for (const r of rules) bySelector.set(r.selector, (bySelector.get(r.selector) || 0) + 1);
  const duplicateSelectors = [...bySelector.entries()].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);

  // dead declarations: within a group, if a property is set K times, K-1 of them are overridden.
  let deadDecls = 0, deadBytes = 0;
  const deadBySelector = [];
  for (const g of groups.values()) {
    if (g.rules.length < 2) continue;
    const byProp = new Map();
    for (const r of g.rules) for (const d of r.decls) {
      if (!byProp.has(d.prop)) byProp.set(d.prop, []);
      byProp.get(d.prop).push(d);
    }
    let groupDead = 0, groupDeadBytes = 0;
    for (const list of byProp.values()) {
      if (list.length < 2) continue;              // set once here: not overridden within this context
      const dead = list.length - 1;               // exactly one wins; the rest are shadowed
      groupDead += dead;
      // the winner is the last !important, else the last overall; the losers carry the wasted bytes
      const winnerBytes = Math.max(...list.map((d) => d.bytes));
      groupDeadBytes += list.reduce((s, d) => s + d.bytes, 0) - winnerBytes;
    }
    if (groupDead > 0) { deadBySelector.push({ selector: g.selector, media: g.media, dead: groupDead }); }
    deadDecls += groupDead; deadBytes += groupDeadBytes;
  }
  deadBySelector.sort((a, b) => b.dead - a.dead);

  // identical duplicate rules: same selector+media AND an identical declaration set (pure copy-paste)
  const seen = new Map(); let identicalRules = 0;
  for (const r of rules) {
    const sig = r.media + '||' + r.selector + '||' + r.decls.map((d) => d.prop + ':' + d.value + (d.important ? '!' : '')).sort().join(';');
    if (seen.has(sig)) identicalRules++; else seen.set(sig, true);
  }

  return {
    rules: rules.length,
    totalDecls,
    uniqueSelectors: bySelector.size,
    importantCount,
    importantDensity: totalDecls ? importantCount / totalDecls : 0,
    duplicateSelectors,
    deadDecls,
    deadBytes,
    redundancy: totalDecls ? deadDecls / totalDecls : 0,
    deadBySelector,
    identicalRules,
  };
}
