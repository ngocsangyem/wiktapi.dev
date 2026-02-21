# Code Review: Schema Migration `entries` → `words`

**Date:** 2026-02-21
**Scope:** `@wiktapi/api` — schema migration from `entries` to `words` (WordData)
**Test state at review time:** 24/24 passing (run from `packages/api/`, not workspace root)

---

## Scope

- Files reviewed: 16
- LOC: ~600 (new/rewritten)
- Focus: type safety, edge cases, SQL injection, test completeness, old-schema remnants
- Scout findings: `mergeRows` assumes homogeneous rows; `JSON.parse` casts have no runtime validation; `parseWord()` emits one meaning per JSONL line rather than grouping by word; `--edition` flag is a misleading holdover

---

## Overall Assessment

The migration is structurally sound. The DDL, SQL constants, route handlers, test fixtures, and test assertions all consistently use the new `words` schema. No old-schema symbols (`ENTRIES_*`, `entries`, `lang_code`, `edition` as a DB column) leak into the new code. Linting passes cleanly. The primary concerns are a **logic mismatch** in `mergeRows` (medium, data correctness), several **silent type casts** (medium), and a handful of missing test cases for boundary conditions.

---

## Critical Issues

None.

---

## High Priority

### 1. `mergeRows` assumes rows share homogeneous metadata — but the fixture exposes a conflict

**File:** `/Users/sangnguyen/Desktop/wiktapi.dev/packages/api/utils/queries.ts` lines 17-33
**File:** `/Users/sangnguyen/Desktop/wiktapi.dev/packages/api/tests/global-setup.ts` lines 36-115

`mergeRows` always uses `first.category`, `first.translate`, `first.tenses`, and `first.phonetic` from the first row returned. The fixture for "run" inserts two rows with different `translate` values at the meaning level but the same word-level `translate: "courir"` — this happens to be consistent. However, in production the import script writes one row per JSONL line (one POS per row), and different rows for the same word will have whatever values `parseWord()` puts in those columns.

The real problem: `parseWord()` always sets `category: "general"` and `translate: null` regardless of which row is first. If two rows for the same word ever differ on `category` (currently impossible given the fixed `"general"` default), `mergeRows` silently picks the first row's value. This is a latent data-correctness risk that will surface the moment `category` assignment is made word-aware.

More immediately, the comment on line 19 says _"Each row holds one POS"_ — this is the expected invariant, but it is never enforced in the query. If the DB contains two rows for the same `(word, category)` pair with different categories, merging by word alone will silently blend them.

**Recommended fix:** Either add `GROUP BY word` with a single row per word in the DB (removing the multi-row-per-word design), or document and enforce the invariant that all rows for a word share identical scalar fields (`category`, `translate`, `phonetic`, `tenses`).

---

### 2. `JSON.parse` casts have no runtime validation

**File:** `/Users/sangnguyen/Desktop/wiktapi.dev/packages/api/utils/queries.ts` lines 20, 26, 30

```typescript
const allMeanings = rows.flatMap((r) => JSON.parse(r.meanings) as Meaning[]);
phonetics: JSON.parse(first.phonetics) as PhoneticItem[],
tenses: first.tenses ? (JSON.parse(first.tenses) as Tenses) : undefined,
```

These are bare casts with no structural check. If the DB contains malformed JSON in any column (corrupted write, partial import, manual edit), the parse will throw an uncaught `SyntaxError` that propagates as a 500 rather than a graceful error. Because better-sqlite3 is synchronous, the error will propagate synchronously and crash the request handler.

**Recommended fix:** Wrap each `JSON.parse` in a try/catch and throw a typed 500 with a message that identifies the broken column. Even a single `safeParseJSON<T>` helper would reduce repetition across three call sites.

---

## Medium Priority

### 3. `parseWord()` produces one row per JSONL line — meanings are never grouped by word

**File:** `/Users/sangnguyen/Desktop/wiktapi.dev/packages/api/scripts/import_data.ts` lines 127-155

Each JSONL line from wiktextract represents one POS entry for a word (e.g., "run" as noun, "run" as verb appear as two separate lines). `parseWord()` creates one `WordRow` per line, storing only that line's POS in `meanings`. This is intentional — `mergeRows` in `queries.ts` later reassembles them. The design works but the comment in `queries.ts` (line 19) states the intent; `import_data.ts` has no corresponding comment explaining _why_ it produces one row per line.

This is not a bug, but it means every word has duplicate `phonetic`, `phonetics`, `category`, `translate`, `tenses`, and `createdAt` values across its rows — wasted storage at scale. If "run" has 5 JSONL lines (noun, verb, adj…), 4 of those `phonetics` JSON blobs are dead weight.

**Recommendation:** Add a comment in `parseWord()` explicitly noting that multi-POS words produce multiple rows that are merged at query time. This prevents future maintainers from "fixing" it by deduplicating rows, which would break `mergeRows`.

### 4. `--edition` flag is a confusing holdover in `import_data.ts`

**File:** `/Users/sangnguyen/Desktop/wiktapi.dev/packages/api/scripts/import_data.ts` lines 6-8, 233-236

The `--edition` flag still exists but now means "which JSONL filename to import" (the filename still uses edition names like `en.jsonl`). The schema no longer has an `edition` column, but the CLI flag is named `--edition` and the `parseArgs()` return type uses `targetEdition`. Externally this is confusing: operators see `--edition` but there is no edition stored.

**Recommendation:** Rename `--edition` to `--file` or `--lang` with a corresponding `targetFile`/`targetLang` variable, and update the usage comment.

### 5. `extractTenses` always sets `future: ""`

**File:** `/Users/sangnguyen/Desktop/wiktapi.dev/packages/api/scripts/import_data.ts` line 122

```typescript
future: "",
```

The wiktextract format doesn't provide a `future` form for English, so the field is always empty. The `Tenses` interface defines `future: string` (non-optional). Any consumer that checks `tenses.future` truthy will always get false. If the OpenAPI spec or client treats all `Tenses` fields as non-empty strings, this is a contract violation.

**Recommendation:** Either change `Tenses.future` to `future?: string` (or `future: string | null`) in `types.ts`, or document that `""` is the canonical "not available" sentinel for `future`.

### 6. `category` is hardcoded to `"general"` for all imported words

**File:** `/Users/sangnguyen/Desktop/wiktapi.dev/packages/api/scripts/import_data.ts` line 150

```typescript
category: "general",
```

The plan specifies defaulting to `"general"` when the source doesn't provide one — and wiktextract JSONL never provides a category. This means the entire production DB will have `category = "general"` for every row. The `categories.get.ts` endpoint will only ever return `["general"]`, and the category filter in search/word routes will be useless.

This is likely a deferred feature ("category assignment is planned separately"), but there is no comment, no TODO, and no indication in the code that this is intentional. A future developer may assume category is populated.

**Recommendation:** Add an explicit `// TODO: assign category from external classification` comment at line 150, and add a note to the plan about how/when categories will be assigned.

### 7. `WORDS_INDEXES_DDL` creates three indexes but SQLite `db.exec()` runs them as a single string

**File:** `/Users/sangnguyen/Desktop/wiktapi.dev/packages/api/utils/schema.ts` lines 20-24

`db.exec(WORDS_INDEXES_DDL)` receives a multi-statement string. `better-sqlite3`'s `exec()` does support multiple semicolon-separated statements, so this works. However, if any single `CREATE INDEX IF NOT EXISTS` fails, the remaining statements are not executed and there is no error surfaced to the caller — `exec()` does not return an error for DDL failures in WAL mode in some edge cases.

This is low-risk for `IF NOT EXISTS` statements, but worth noting.

---

## Low Priority

### 8. `getRouterParam(event, "word")!` non-null assertion without URL decode

**File:** `/Users/sangnguyen/Desktop/wiktapi.dev/packages/api/routes/v1/word/[word].get.ts` line 53
**File:** All sub-word route handlers

```typescript
const word = getRouterParam(event, "word")!;
```

If a client requests `/v1/word/caf%C3%A9`, `getRouterParam` may or may not URL-decode the param depending on the Nitro version. There is no explicit `decodeURIComponent()` call. For the current English-only dataset this is low-risk, but worth a guard if international words are planned.

### 9. `searchWords` does not trim the input prefix

**File:** `/Users/sangnguyen/Desktop/wiktapi.dev/packages/api/utils/queries.ts` lines 56-81

If `q` is `"  chat  "` (leading/trailing spaces), the LIKE pattern becomes `"  chat  %"` which will never match. The search route passes `q` directly from the query string without trimming. A simple `.trim()` before passing to `searchWords` would prevent silent empty results.

### 10. OpenAPI schema for `tenses` uses `nullable: true` without `oneOf`

**File:** `/Users/sangnguyen/Desktop/wiktapi.dev/packages/api/routes/v1/word/[word]/tenses.get.ts` lines 29-41

OpenAPI 3.0 requires `nullable: true` alongside the type. OpenAPI 3.1 uses `oneOf: [{type: "object",...}, {type: "null"}]`. The current schema uses `type: "object"` with `nullable: true` — valid for 3.0 but may cause codegen issues with 3.1-targeting tools.

---

## Edge Cases Found by Scout

| #   | Location                  | Edge Case                                                                                                                                                                                                                                                   |
| --- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `queries.ts:20`           | `JSON.parse(r.meanings)` on a row where `meanings` is an empty JSON array `[]` — `flatMap` returns `[]`, `allMeanings` is empty. This returns a `WordRecord` with zero meanings, which is valid per types but probably not the intent. No test covers this. |
| 2   | `queries.ts:17`           | `mergeRows` called with rows from different categories (if word exists in multiple categories in DB). First row wins silently.                                                                                                                              |
| 3   | `import_data.ts:83`       | `glosses?.[0] ?? ""` — if `glosses` is `[]` (empty array), definition becomes `""`. The `.filter((d) => d.definition)` on line 87 removes it, so empty-gloss senses are silently dropped.                                                                   |
| 4   | `import_data.ts:66-73`    | `extractPhonetics` only keeps sounds where `typeof s.ipa === "string"`. If all sounds lack IPA, `phonetics` is `[]` and `phonetic` is `null`. Routes return `phonetics: []` — valid but untested.                                                           |
| 5   | `search.get.ts:57`        | `q` is checked for truthiness — an empty string `q=""` passes `if (!q)` and proceeds to `searchWords("", ...)`, producing `LIKE "%"` which returns up to 50 arbitrary rows. Consider `q.trim().length === 0` check.                                         |
| 6   | `global-setup.ts:142-156` | `setup()` calls `db.exec(WORDS_TABLE_DDL)` but does NOT drop the table first. If `test.db` from a previous run exists with the old schema, the test run uses stale data without warning.                                                                    |

---

## Positive Observations

- Complete elimination of old schema references in route/query/test files — no `ENTRIES_*`, `lang_code`, `edition` DB columns, or `EntryRow` survive.
- The `LIKE ? ESCAPE '\\'` pattern in `searchWords` is correctly parameterized — no SQL injection surface.
- `Effect.acquireRelease` in `import_data.ts` ensures the DB is closed even on error.
- The `crlfDelay: Infinity` option in readline correctly handles Windows-format JSONL.
- `BATCH_SIZE = 50_000` with a transaction-per-batch is a solid pattern for bulk insert.
- Test fixtures cover multi-row merge, null tenses, category filter, and case-insensitive search.
- `teardown()` in `global-setup.ts` cleans up `test.db` after runs.

---

## Recommended Actions (Prioritized)

1. **(High)** Wrap `JSON.parse` calls in `queries.ts` in try/catch; surface as 500 with column context. This prevents silent crashes on DB corruption.
2. **(High)** Document or enforce the invariant that all rows for a word share the same `category`, `translate`, `phonetic`, `tenses` values — or refactor to a single-row-per-word design.
3. **(Medium)** Fix `Tenses.future` type to `string | ""` sentinel or `future?: string` to correctly represent "not available" in both the type system and API contract.
4. **(Medium)** Add a trim call: `q.trim()` in `search.get.ts` before passing to `searchWords`, and also check empty string after trim.
5. **(Medium)** Add a TODO comment at `parseWord()` category line explaining that all words default to `"general"` until an external classifier is integrated.
6. **(Medium)** Rename `--edition` CLI flag to `--file` or `--lang` in `import_data.ts` to reduce confusion now that `edition` is not a DB column.
7. **(Low)** Add test for `q=""` (empty string after trim) returning 400.
8. **(Low)** Add test for a word whose `phonetics` is `[]` (no IPA in source) to confirm route returns `phonetic: null, phonetics: []`.
9. **(Low)** Add test for a word not found when filtering by a valid but non-matching `category` (should 404).

---

## Metrics

- Linting issues: 0
- Tests: 24/24 pass (run from `packages/api/`)
- Note: `vp test --project @wiktapi/api` from workspace root reports 3 suite failures ("No test suite found") — this is a Vitest workspace configuration issue, not a code bug. The `vitest.config.ts` in `packages/api/` uses absolute `include` paths that only resolve correctly when Vitest is launched from that directory.

---

## Unresolved Questions

1. Is the multi-row-per-word design (one row per POS) intentional long-term, or will a future migration collapse rows into a single row per word?
2. When will `category` assignment be implemented? Is there a planned classifier or manual tagging workflow?
3. Does the Nitro/h3 version in use URL-decode `getRouterParam` results automatically? Needs verification for non-ASCII words.
4. Is OpenAPI 3.0 or 3.1 targeted? The `nullable: true` pattern differs between versions.
