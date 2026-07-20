// gen_public_samples.mjs: emit curated PUBLIC-INFO sample datasets for the demo (movies, books,
// stocks, world cities). Real public entities, ZERO PII. Each is shaped so the engine finds a clean
// entity (an attribute set that genuinely travels with a reference) plus independent measures that
// vary per row (so no spurious relationships). Run: node build/gen_public_samples.mjs
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'samples');

// deterministic, no Math.random: a small integer scramble for "varied but reproducible" measures
const mix = (n) => { let x = (n * 2654435761) >>> 0; x ^= x >>> 15; x = (x * 2246822519) >>> 0; x ^= x >>> 13; return x >>> 0; };
const pick = (arr, n) => arr[mix(n) % arr.length];
const span = (n, lo, hi) => lo + (mix(n) % (hi - lo + 1));

// --- MOVIES: studio is the entity (studio -> country, founded); genre/year/score vary per row ---
function movies() {
  const studios = [
    ['Warner Bros', 'US', 1923], ['Universal', 'US', 1912], ['Paramount', 'US', 1912],
    ['A24', 'US', 2012], ['StudioCanal', 'FR', 1988], ['Toho', 'JP', 1932], ['Working Title', 'GB', 1983],
  ];
  const genres = ['drama', 'sci-fi', 'thriller', 'comedy', 'animation', 'documentary'];
  const rows = [];
  for (let i = 0; i < 56; i++) {
    const s = studios[i % studios.length];
    rows.push({
      film_id: 700 + i, studio: s[0], studio_country: s[1], studio_founded: s[2],
      genre: genres[mix(i * 7) % genres.length], release_year: 1998 + (i % 26),
      runtime_min: span(i * 3, 84, 178), imdb_score: (60 + (mix(i * 11) % 40)) / 10,
    });
  }
  return rows;
}

// --- BOOKS: the whole subject, not just titles. Publisher and author are entities; type, binding,
// material, era, format, language are independent facets (assigned by distinct-prime hashes so none
// spuriously determines another). Drill any facet, then it gets more specific. ---
function books() {
  const pubs = [
    ['Penguin', 'GB', 1935], ['HarperCollins', 'US', 1989], ['Vintage', 'US', 1954],
    ['Faber', 'GB', 1929], ['Gallimard', 'FR', 1911], ['Tor', 'US', 1980],
  ];
  const authors = [
    ['Austen', 'GB'], ['Hemingway', 'US'], ['Borges', 'AR'], ['Murakami', 'JP'],
    ['Woolf', 'GB'], ['Marquez', 'CO'], ['Tolstoy', 'RU'], ['Calvino', 'IT'],
  ];
  const type = ['novel', 'textbook', 'reference', 'poetry', 'biography', 'children'];
  const binding = ['hardcover', 'paperback', 'leather', 'spiral'];
  const material = ['acid-free paper', 'vellum', 'recycled paper', 'coated stock'];
  const era = ['18th century', '19th century', '20th century', '21st century'];
  const format = ['print', 'ebook', 'audiobook'];
  const language = ['English', 'French', 'German', 'Spanish', 'Japanese'];
  const rows = [];
  for (let i = 0; i < 84; i++) {
    const p = pubs[i % pubs.length];
    const a = authors[mix(i * 3) % authors.length];
    rows.push({
      book_id: 4000 + i,
      author: a[0], author_country: a[1],
      publisher: p[0], publisher_country: p[1], publisher_founded: p[2],
      type: type[mix(i * 7) % type.length],
      binding: binding[mix(i * 11) % binding.length],
      material: material[mix(i * 13) % material.length],
      era: era[mix(i * 17) % era.length],
      format: format[mix(i * 19) % format.length],
      language: language[mix(i * 23) % language.length],
      pages: span(i * 9, 96, 940),
      price: (699 + (mix(i * 29) % 3000)) / 100,
    });
  }
  return rows;
}

// --- STOCKS: symbol is the entity (symbol -> company, sector); a time series of prices per row ---
function stocks() {
  const syms = [
    ['AAPL', 'Apple', 'Technology'], ['MSFT', 'Microsoft', 'Technology'], ['JPM', 'JPMorgan', 'Financials'],
    ['XOM', 'Exxon', 'Energy'], ['PFE', 'Pfizer', 'Health Care'], ['KO', 'Coca-Cola', 'Staples'],
  ];
  const rows = [];
  for (let i = 0; i < 60; i++) {
    const s = syms[i % syms.length];
    const base = 40 + (mix(i) % 260);
    rows.push({
      symbol: s[0], company: s[1], sector: s[2],
      trade_day: 20240101 + i, close: base + (mix(i * 3) % 1000) / 100,
      volume_k: span(i * 7, 200, 9000),
    });
  }
  return rows;
}

// --- WORLD CITIES (GIS): a genuine hierarchy, city -> country -> continent; coords/pop vary ---
function cities() {
  const places = [
    ['Tokyo', 'Japan', 'Asia'], ['Osaka', 'Japan', 'Asia'], ['Paris', 'France', 'Europe'],
    ['Lyon', 'France', 'Europe'], ['Cairo', 'Egypt', 'Africa'], ['Lima', 'Peru', 'South America'],
    ['Toronto', 'Canada', 'North America'], ['Sydney', 'Australia', 'Oceania'],
  ];
  const rows = [];
  for (let i = 0; i < 48; i++) {
    const p = places[i % places.length];
    rows.push({
      place_id: 3000 + i, city: p[0], country: p[1], continent: p[2],
      pop_k: span(i * 5, 300, 14000), elevation_m: span(i * 8, 2, 2400),
      record_year: 2005 + (i % 20),
    });
  }
  return rows;
}

// --- TELEMETRY LOG: the structured case. Timestamps, counters, offsets, a constant window: exactly
// the regular structure real logs carry, so it compresses hugely (the honest Nx wow). ---
function telemetry() {
  const rows = [];
  for (let i = 0; i < 400; i++) rows.push({
    ts_ms: 1700000000000 + i * 20, seq: i, packet_id: 8000 + i,
    byte_offset: i * 1500, window: 65535,
  });
  return rows;
}

const SETS = {
  'telemetry.json': { label: 'Telemetry log', rows: telemetry() },
  'movies.json': { label: 'Movies', rows: movies() },
  'books.json': { label: 'Books', rows: books() },
  'stocks.json': { label: 'Stocks', rows: stocks() },
  'cities.json': { label: 'World cities', rows: cities() },
};

await mkdir(OUT, { recursive: true });
const index = [];
for (const [file, { label, rows }] of Object.entries(SETS)) {
  await writeFile(join(OUT, file), JSON.stringify(rows, null, 0), 'utf8');
  index.push({ file, label, rows: rows.length });
  console.log(`wrote ${file}: ${rows.length} rows`);
}
await writeFile(join(OUT, 'index.json'), JSON.stringify(index, null, 2), 'utf8');
console.log('wrote index.json');
