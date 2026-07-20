# TetraCubeDB, Product Spec

Two products, one engine. The engine (this repo's `src/`) is done and receipted; the products are how
it reaches people. Marketing and UI speak in outcomes, never internals (the Ferrari, not the drivetrain).

---

## 1. The Demo (the site, tetracubedb.us)

- **What:** a gated (username/password) marketing + preview site, plus the downloadable bundle.
- **Runs in:** the browser, on the portable engine (`web/app.html`).
- **Data:** curated PUBLIC datasets only (movies, books, stocks, world cities, ...). Real public info,
  **zero PII**. One-click samples that show the engine finding entities, relationships, patterns, and a
  lossless proof. Never fails live (bundled, no APIs, no CORS).
- **Purpose:** dazzle with capability, drive the purchase, hand off the download.

## 2. The Download (the product people buy)

An **empty shell**. No bundled data. It is a tool for the user's *own* data, running entirely on their
machine. Delivered as a **desktop app** (needed for default system-folder access and local security;
a browser sandbox cannot silently read system folders).

### 2.1 Sources (what it connects to)

- **Local files, by default:** Downloads, Pictures, Video, Music, Documents.
- **User choice:** the user adds or removes any folders/files they want included. We never choose for them.
- **Passive connectors:** read-only, schema-agnostic. The app does not prescribe, reach out, or mutate.
  It passively reads whatever the user points it at, and the engine organizes whatever shape comes back.
  One generic connector pattern, not a pile of specific integrations. We cannot anticipate every source,
  so we do not try: beyond the starter registry, the user supplies ANY source, a REST endpoint, a
  software app's API, a URL, a file, through one generic "Add a source" connector. Everything, starter
  or user-supplied, is passive and read-only.
- **Pointer system (APIs + datastores + software):** a pointer is an *address*, not a copy. The user
  registers a source, an API endpoint, a datastore, or another piece of software, and the app holds the
  pointer; the data blooms at runtime only when the user traverses to it. Decoupled by default,
  relationships derived on demand.
- **Language-agnostic, both directions.** Connectors speak neutral protocols (HTTP/JSON, files, stdio,
  SQL), so they do not care what language anything is written in. And TetraCube exposes a plain local
  interface (a local HTTP/JSON API and a CLI) so software in ANY language can drive the engine. The core
  data model is pure records/dimensions/rules, no language lock-in.
- **AI is an optional connector, never provided.** The core is deterministic and needs no model (the
  non-AI AI). If a user wants AI, they connect their own (an LLM endpoint is just another pointer),
  off by default, never a dependency. We ship no model.
- **Public-API registry (a datastore of pointers).** A searchable table of public APIs, tagged by
  domain/keywords with endpoint + auth. A query ("book titles") searches the registry and routes to the
  matching APIs, then connects live on demand. Starter table shipped (web/data/api-registry.json, real
  APIs; `browser:true` = CORS-open/no-key so it works in the browser demo); users add their own. It can
  scale to thousands of APIs stored COMPRESSED, and is read/searched WITHOUT full decompress (addressed
  access derives the match; a light index helps keyword search); only the entry you actually CALL is
  decompressed. Routing UX: if a match needs a key, the app says so and prompts; if several match, the
  user says "pick best" (auto-rank, prefer no-key/most-relevant) or "give me options" (list them). Each
  entry marks key vs no-key; if a key is needed, the app links straight to where to create one
  (`key_url`) when available. Demo uses canned samples to make getting started easy; product uses live.

### 2.2 What it does (the engine, in outcome language)

- **Organizes dimensionally, no duplication.** Each thing stored once (as a seed), addressed, deduped.
- **Finds duplicates exactly.** Content-hash (the engine's SHA) finds byte-identical files, losslessly.
- **Finds relationships automatically.** Entities and couplings discovered from the data, not declared.
- **Instant retrieval by coordinate.** Jump straight to any point / line / table / volume by address;
  traverse across a capstone to the dimension it opens.
- **Delta propagation.** Change a value, dependents re-derive along local edges only.
- **Reports.** Compose and export findings.
- **Proof, always.** Lossless SHA round-trip + tamper-evident provenance seal on every result.

### 2.3 Security, built in (not bolted on)

- **Local-only.** Nothing leaves the user's machine. No telemetry of their data.
- **Read-only by default.** The app never modifies the user's files; connectors are read-only.
- **Permission-gated.** Access to folders and sources is explicit and revocable; least privilege.
- **Tamper-evident.** SHA seals detect any change to indexed content (integrity, provenance).
- **Secrets encrypted at rest.** Pointer credentials (API keys, connection strings) are stored
  encrypted locally, never in plaintext. (Honest floor: SHA is integrity, not confidentiality; for
  confidentiality we encrypt, and the pointer store composes with OS keychain / encryption.)
- **Licensing.** The purchase issues a license key validated by the shell; the storefront (site) is the
  only network touchpoint, and it never sees user data.

## 2.4 The dimensional model (the foundation, kept out of the UI copy)

This is how the product thinks; users never see these words, they see outcomes.

- **The ladder:** void (empty) -> **point** (a name/identity, for instant retrieval) -> **line** (a
  sequence) -> **width** (a row) -> **volume** (deltas, timelines, trends, depth) -> then it collapses
  to a **point one plane up**. Recursion.
- **A dimension is a type, and its name is a point that symbolically holds everything that type could
  ever be.** "Toyota" could touch any of their cars, products, the company, its stock, its holdings,
  all latent, none connected until needed. Store the generator (the name/type), derive the field (the
  connected detail) on demand.
- **No prior relationships. Built on demand by drilling.** Car > Toyota > Corolla connects at that
  moment. The same name bridges ACROSS sources (a car catalog's "Toyota" links to a stock feed's
  "Toyota") only when reached for, this cross-source bridge is what the pointer/connector system is for.
- **Identity vs type:** the dimension is the type (car, owner); VIN / plate / DL# is the point that
  pins one instance.
- **Compression is the same rule+residual**, named "compression" because people know the word. Datasets,
  files, or folders collapse to a rule; click to bloom back, exact. Shown as a multiplier ("143x", the
  wow reads better than "99%"), with original->new size and time, and a light tooltip: not a zip, it
  keeps the pattern's rules plus a small residual. It wins exactly the structure present (flat/random
  stays the same), and the rebuild is byte-for-byte (SHA-verified).
- **Portable, self-describing compressed files.** Save & Compress emits a file that carries its own
  bloom instructions (the inverse, z=x/y), so ANY computer rebuilds it with no special software, the
  simplest form is a tiny self-contained HTML that reconstructs and offers the original on open. Nothing
  is saved unless the user explicitly saves; by default the app OBSERVES/REFERENCES sources, never holds
  them. It is all in the rules.
- **Open by default, prefab holdings when known.** We dictate no schema. Optionally, a **holding** is a
  prebuilt, reusable, encapsulated dimensional unit (an "invoice", a "car", a scenario) that is itself a
  point/line/plane/volume you can drop in, reuse, and connect. Holdings live in the engine's versioned
  **rule registry** (already built), a named, durable encapsulation, so this is registered structure,
  not a new architecture.

## 3. Architecture

- **One engine, two shells.** `src/` is the portable, zero-Node-dependency engine (already browser-safe).
- **Demo shell:** `web/app.html` served on the gated site (and the same file is the offline-capable
  browser preview).
- **Download shell:** a desktop app. Recommended **Electron** (JS end-to-end, the engine is JS, fastest
  to ship; renderer runs the same `web/` UI, a hardened main process does read-only file access and the
  encrypted pointer store). Leaner alternative: **Tauri** (smaller binary, system webview) if we accept a
  Rust core. Either way the analysis UI and engine are shared with the demo.

## 4. Build phases

1. **Engine** — DONE (analyze, find relationships/entities, portable SHA, always lossless). Receipted.
2. **Demo UI** — DONE first pass (`web/app.html`: what-we-found, instant lookup, table, proof, public
   samples). Remaining: report builder, live propagation view, multi-source view.
3. **Download shell (Electron):** window + hardened main process; default-folder indexing (read-only);
   the "add/remove folders" source manager; the passive connector + pointer store (encrypted); wire the
   existing analysis UI to the local index; licensing check.
4. **File-index analysis:** treat each file as a record (path, type, size, dates, content-hash, and
   type-specific metadata) so the engine dedupes and organizes the user's folders, the killer personal
   utility.
5. **Packaging + storefront:** signed installers per OS; the site's buy → license → download flow.

## 5. Honest guards (carry through, per PRIMER Section 4)

Promote what it does, not how it works. No speed claim (derive-not-store is memory, not time). Lossless
only by rule+residual with a SHA round-trip (verified, always). Win exactly the structure present,
degrade to flat honestly. The method (lens registry, rule-finding, residual-taming) stays private.
