# Schema Migration: Wiktionary `entries` → `words` (WordData)

## Objective

Migrate the entire `@wiktapi/api` package from the old Wiktionary-centric `entries` schema to a new vocabulary-focused `words` schema based on the TypeScript types defined below. Every layer of the stack — DDL, import script, query utilities, API routes, OpenAPI specs, and tests — must be updated atomically.

---

## New TypeScript Types

These are the **source-of-truth** types. All SQL columns, INSERT statements, query result interfaces, and API response shapes must align with these.

```typescript
export interface PhoneticItem {
  text: string;
  type: "uk" | "us";
  audioUrl?: string | null;
}

export interface Definition {
  definition: string;
  example?: string;
  definitionTranslate?: string;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  translate: string | null;
  synonyms?: string[];
  antonyms?: string[];
}

export interface Tenses {
  base: string;
  past: string;
  present: string;
  future: string;
  singular: string;
  plural: string;
}

export interface ConfusableWord {
  word: string;
  meanings: Meaning[];
}

export type WordCategory =
  | "technology"
  | "business"
  | "travel"
  | "music"
  | "movies"
  | "sports"
  | "food"
  | "art"
  | "science"
  | "health"
  | "fashion"
  | "gaming"
  | "books"
  | "nature"
  | "photography"
  | "education"
  | "history"
  | "politics"
  | "automotive"
  | "pets"
  | "general";

export const WORD_CATEGORIES: readonly WordCategory[] = [
  "technology",
  "business",
  "travel",
  "music",
  "movies",
  "sports",
  "food",
  "art",
  "science",
  "health",
  "fashion",
  "gaming",
  "books",
  "nature",
  "photography",
  "education",
  "history",
  "politics",
  "automotive",
  "pets",
  "general",
] as const;

export interface WordData {
  word: string;
  phonetic: string | null;
  phonetics: PhoneticItem[];
  meanings: Meaning[];
  category: WordCategory;
  translate: string | null;
  tenses?: Tenses;
  // confusable?: ConfusableWord[];  // reserved for future use
}

export interface WordRecord extends WordData {
  id: string;
  createdAt: string;
}
```

---

## New SQLite Table Design

The old `entries` table is replaced by a `words` table. Complex nested objects are stored as JSON `TEXT` columns.

```sql
CREATE TABLE IF NOT EXISTS words (
  id         TEXT PRIMARY KEY,
  word       TEXT NOT NULL,
  phonetic   TEXT,
  phonetics  TEXT NOT NULL,   -- JSON: PhoneticItem[]
  meanings   TEXT NOT NULL,   -- JSON: Meaning[]
  category   TEXT NOT NULL,   -- one of WordCategory values
  translate  TEXT,
  tenses     TEXT,            -- JSON: Tenses | null
  createdAt  TEXT NOT NULL    -- ISO 8601 timestamp
);
```

### Indexes

Design appropriate indexes based on expected query patterns:

```sql
CREATE INDEX IF NOT EXISTS idx_word          ON words (word);
CREATE INDEX IF NOT EXISTS idx_category      ON words (category);
CREATE INDEX IF NOT EXISTS idx_word_category ON words (word, category);
```

---

## Column Mapping (Old → New)

| Old Column     | New Column  | Notes                                                    |
| -------------- | ----------- | -------------------------------------------------------- |
| `id` (INTEGER) | `id` (TEXT) | Changed to TEXT (use UUID or nanoid)                     |
| `word`         | `word`      | Kept                                                     |
| `lang_code`    | `lang_code` | Optional                                                 |
| `lang`         | `lang`      | Optional                                                 |
| `edition`      | `edition`   | Optional                                                 |
| `pos`          | —           | **Removed** (now inside `meanings[].partOfSpeech`)       |
| `senses`       | `meanings`  | Restructured: now `Meaning[]` with nested `Definition[]` |
| `sounds`       | `phonetics` | Restructured: now `PhoneticItem[]`                       |
| `translations` | `translate` | Simplified: single `string \| null`                      |
| `forms`        | `tenses`    | Restructured: now `Tenses` object or null                |
| —              | `phonetic`  | **New**: primary phonetic string                         |
| —              | `category`  | **New**: `WordCategory` enum value                       |
| —              | `createdAt` | **New**: ISO 8601 timestamp                              |

---

## Files to Update

### 1. `packages/api/utils/schema.ts` — DDL & SQL constants

**Priority: FIRST — this is the source of truth.**

- Replace `ENTRIES_TABLE_DDL` with `WORDS_TABLE_DDL` using the new `CREATE TABLE words (...)` statement above.
- Replace `ENTRIES_INDEXES_DDL` with `WORDS_INDEXES_DDL` using the new index definitions.
- Replace `ENTRIES_INSERT_SQL` with `WORDS_INSERT_SQL`:
  ```sql
  INSERT INTO words (id, word, phonetic, phonetics, meanings, category, translate, tenses, createdAt)
  VALUES (@id, @word, @phonetic, @phonetics, @meanings, @category, @translate, @tenses, @createdAt)
  ```
- Export the new `WordData`, `WordRecord`, `PhoneticItem`, `Definition`, `Meaning`, `Tenses`, `WordCategory`, `WORD_CATEGORIES`, and `ConfusableWord` types from this file (or a dedicated `types.ts` — your choice, but keep it in `utils/`).

### 2. `packages/api/scripts/import_data.ts` — Data import script

- Replace the `EntryRow` interface with a new `WordRow` interface matching the INSERT columns.
- Rewrite `parseEntry()` → `parseWord()` to map incoming JSONL fields to the new `WordRow` shape:
  - Generate a unique `id` (e.g. `crypto.randomUUID()` or nanoid).
  - Map phonetic data into `PhoneticItem[]` JSON.
  - Map senses/pos into `Meaning[]` JSON (each meaning has `partOfSpeech`, `definitions[]`, `translate`, `synonyms`, `antonyms`).
  - Map forms into a `Tenses` object or null.
  - Determine `category` (default to `"general"` if not determinable from source data).
  - Set `createdAt` to current ISO timestamp.
- Update all references: `ENTRIES_TABLE_DDL` → `WORDS_TABLE_DDL`, `ENTRIES_INDEXES_DDL` → `WORDS_INDEXES_DDL`, `ENTRIES_INSERT_SQL` → `WORDS_INSERT_SQL`.
- Update the final `SELECT COUNT(*)` query to use `FROM words` instead of `FROM entries`.
- Update `--fresh` drop statement to `DROP TABLE IF EXISTS words`.

### 3. `packages/api/scripts/build_indexes.ts` — Index builder

- Replace `ENTRIES_INDEXES_DDL` import with `WORDS_INDEXES_DDL`.
- Update the `SELECT COUNT(*)` query to use `FROM words`.

### 4. `packages/api/utils/queries.ts` — Query functions

- Replace the `EntryRow` interface with a new interface matching the SELECT result (likely a subset of `WordRecord`).
- Rewrite `fetchWordEntries()` → `fetchWord()` (or similar):
  - The SQL should query `FROM words WHERE word = ?` (no more `edition` or `lang_code` filters).
  - Optionally add `category` filter support.
  - Update the return type.
- Consider adding new query functions:
  - `fetchWordsByCategory(category: WordCategory): WordRecord[]`
  - `searchWords(prefix: string, category?: WordCategory): ...`

### 5. `packages/api/routes/v1/[edition]/word/[word].get.ts` — Full word entry route

- **Restructure the route path**: The `[edition]` path segment no longer makes sense (no `edition` column). Consider moving to `/v1/word/[word].get.ts` or keep `[edition]` if you plan to use it differently.
- Update the handler to call the new query function.
- Update the response shape to return `WordData` fields: `word`, `phonetic`, `phonetics`, `meanings`, `category`, `translate`, `tenses`.
- Update the OpenAPI `defineRouteMeta` schema to match the new response shape.
- Remove `lang` query parameter (no longer applicable).

### 6. `packages/api/routes/v1/[edition]/word/[word]/definitions.get.ts` — Definitions route

- Update to return `meanings` (each with `partOfSpeech`, `definitions[]`, `translate`, `synonyms`, `antonyms`) instead of the old senses grouping.
- Update OpenAPI schema.
- Adjust route path if `[edition]` is removed.

### 7. `packages/api/routes/v1/[edition]/word/[word]/translations.get.ts` — Translations route

- The `translate` field is now a simple `string | null` on `WordData` plus per-meaning `translate`. Update accordingly.
- Update OpenAPI schema.
- Adjust route path if `[edition]` is removed.

### 8. `packages/api/routes/v1/[edition]/word/[word]/pronunciations.get.ts` — Pronunciations route

- Return `phonetic` (string) + `phonetics` (PhoneticItem[]) instead of parsing old `sounds` JSON.
- Update OpenAPI schema — each item has `text`, `type` ("uk"/"us"), `audioUrl`.
- Adjust route path if `[edition]` is removed.

### 9. `packages/api/routes/v1/[edition]/word/[word]/forms.get.ts` — Forms route

- Rename to a "tenses" route (or keep as forms).
- Return the `Tenses` object (`base`, `past`, `present`, `future`, `singular`, `plural`) instead of old forms array.
- Update OpenAPI schema.
- Adjust route path if `[edition]` is removed.

### 10. `packages/api/routes/v1/[edition]/search.get.ts` — Search route

- Remove `edition` from WHERE clause (or restructure the route path).
- Update the SQL to query `FROM words` and return `word`, `category`, `phonetic` as search result fields (instead of `word`, `lang_code`, `lang`, `pos`).
- Update the `Row` type alias and OpenAPI schema.

### 11. `packages/api/routes/v1/editions.get.ts` — Editions metadata route

- **Decide**: This endpoint lists distinct `edition` values, which no longer exist. Either:
  - **Remove** this route entirely, OR
  - **Replace** with a `/v1/categories` route that lists distinct `category` values from the `words` table.

### 12. `packages/api/routes/v1/languages.get.ts` — Languages metadata route

- **Decide**: This endpoint lists distinct `lang_code`/`lang` values, which no longer exist. Either:
  - **Remove** this route entirely, OR
  - **Repurpose** as a different metadata endpoint.

### 13. `packages/api/tests/global-setup.ts` — Test database setup

- Update the `SAMPLE_ENTRIES` array → `SAMPLE_WORDS` with objects matching the new `words` table columns:
  ```typescript
  const SAMPLE_WORDS = [
    {
      id: "test-1",
      word: "chat",
      phonetic: "/tʃæt/",
      phonetics: JSON.stringify([
        { text: "/tʃæt/", type: "us", audioUrl: null },
        { text: "/tʃæt/", type: "uk", audioUrl: null },
      ]),
      meanings: JSON.stringify([
        {
          partOfSpeech: "noun",
          definitions: [{ definition: "an informal conversation" }],
          translate: null,
          synonyms: ["talk", "conversation"],
          antonyms: [],
        },
      ]),
      category: "general",
      translate: null,
      tenses: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    // ... more sample words covering different categories, tenses, etc.
  ];
  ```
- Replace all `ENTRIES_*` imports with `WORDS_*` equivalents.
- Update `DROP TABLE IF EXISTS entries` → `DROP TABLE IF EXISTS words` if applicable.

### 14. `packages/api/tests/routes/word.test.ts` — Word route tests

- Update all assertions to match the new response shapes:
  - `result.entries[0]?.senses` → `result.meanings[0]?.definitions`
  - Test `phonetic`, `phonetics`, `category`, `translate`, `tenses` fields.
- Remove `lang` filter tests (or replace with `category` filter tests).
- Remove `edition` from test event params if the route path changes.

### 15. `packages/api/tests/routes/search.test.ts` — Search route tests

- Update assertions for new result shape (`word`, `category` instead of `word`, `lang_code`, `lang`, `pos`).
- Remove `edition` from test event params if applicable.
- Add tests for category filtering if the new search supports it.

### 16. `packages/api/tests/routes/metadata.test.ts` — Metadata route tests

- If `editions.get.ts` is replaced with `categories.get.ts`, rewrite the editions tests → categories tests.
- If `languages.get.ts` is removed, remove the corresponding tests.
- Add tests for the new category list endpoint.

---

## Execution Order

Follow this order to avoid breaking intermediate states:

1. **Types & Schema** — `utils/schema.ts` (add new types + DDL + SQL)
2. **Query Layer** — `utils/queries.ts` (new interfaces + query functions)
3. **Import Script** — `scripts/import_data.ts` (new parser + row mapping)
4. **Index Script** — `scripts/build_indexes.ts` (update imports + table name)
5. **API Routes** — all files in `routes/v1/` (new handlers + OpenAPI specs)
6. **Test Fixtures** — `tests/global-setup.ts` (new sample data)
7. **Test Cases** — all files in `tests/routes/` (new assertions)
8. **Verify** — run `vp run @wiktapi/api#test` to confirm everything passes

---

## Important Notes

- **No data migration** is needed — the import script will re-import from JSONL with `--fresh`.
- **Breaking API change** — all API consumers will need to update. Document the new response shapes.
- **`edition` removal** — all route paths containing `[edition]` need to be restructured (e.g. `/v1/[edition]/word/[word]` → `/v1/word/[word]`).
- The `ConfusableWord` type is reserved for future use (commented out in `WordData`). Do not create a column for it yet.
- Use `crypto.randomUUID()` for generating `id` values in the import script.
- Default `category` to `"general"` when the source JSONL data does not provide one.
