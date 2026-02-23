# WiktAPI

Dictionary REST API powered by [wiktextract](https://github.com/tatuylonen/wiktextract) data and built on [Nitro](https://nitro.build).

## Stack

- **Runtime:** Nitro (Node.js)
- **Database:** SQLite via `better-sqlite3`
- **Schema:** `words` (1 row per headword) → `meanings` (N rows per word, one per POS)
- **Data source:** [kaikki.org](https://kaikki.org) wiktextract JSONL dumps

---

## Development

```bash
vp run @wordictapi/api#dev       # start dev server (http://localhost:3000)
vp run @wordictapi/api#build     # production build
vp run @wordictapi/api#test      # run tests
```

---

## Database Pipeline

Run these steps in order to populate the database from scratch.

### 1. Download

Download wiktextract JSONL dump(s) into `data/jsonl/`:

```bash
vp run @wordictapi/api#download
```

### 2. Import

Parse and load JSONL data into `data/wiktionary.db`:

```bash
vp run @wordictapi/api#import                         # import all editions
vp run @wordictapi/api#import -- --edition en         # single edition
vp run @wordictapi/api#import -- --fresh              # drop tables first, then import
vp run @wordictapi/api#import -- --output data/wiktionary.db.new --skip-indexes  # staging
```

> The JSONL file is deleted after a successful import.

**Import filters** (entries are skipped when):

- First character is not a Unicode letter (e.g. `--hehⁿ`, `++good`, `---`)
- Word contains any digit
- Word contains special characters: ``~!@#$%^&*()`<>|\[]{};:'"<>,/?``

### 3. Build indexes (if `--skip-indexes` was used)

```bash
vp run @wordictapi/api#index
vp run @wordictapi/api#index -- --output data/wiktionary.db.new  # staging
```

### 4. Swap staging DB into production

```bash
vp run @wordictapi/api#swap   # renames wiktionary.db.new → wiktionary.db
```

### Cleanup (optional)

Remove invalid words already in the database (e.g. from an import before filters were tightened):

```bash
vp run @wordictapi/api#cleanup            # dry-run — preview what would be deleted
vp run @wordictapi/api#cleanup:execute    # execute deletion (meanings cascade)
vp run @wordictapi/api#cleanup -- --db data/wiktionary.db.new  # custom path
```

### One-time schema migration

If upgrading from the legacy single-table schema to the current `words + meanings` schema:

```bash
vp run @wordictapi/api#migrate
```

---

## API Reference

Base URL: `http://localhost:3000`

### Words list

| Method | Path                  | Description                           |
| ------ | --------------------- | ------------------------------------- |
| `GET`  | `/v1/words`           | Paginated word list                   |
| `GET`  | `/v1/search?q=<term>` | Search words (supports `?regex=true`) |

**`GET /v1/words`** query params: `page`, `limit`, `edition`

### Single word

| Method   | Path             | Description           |
| -------- | ---------------- | --------------------- |
| `GET`    | `/v1/word/:word` | Fetch word by string  |
| `GET`    | `/v1/word/:id`   | Fetch word by UUID    |
| `POST`   | `/v1/word`       | Create word           |
| `PUT`    | `/v1/word/:word` | Update word by string |
| `PUT`    | `/v1/word/:id`   | Update word by UUID   |
| `DELETE` | `/v1/word/:word` | Delete word by string |
| `DELETE` | `/v1/word/:id`   | Delete word by UUID   |

**`POST /v1/words/bulk-delete`** — delete multiple words by ID array.

### Word sub-resources

| Method | Path                               | Description                |
| ------ | ---------------------------------- | -------------------------- |
| `GET`  | `/v1/word/:word/definitions`       | Definitions grouped by POS |
| `GET`  | `/v1/word/:word/pronunciations`    | Phonetics / IPA            |
| `GET`  | `/v1/word/:word/synonyms-antonyms` | Synonyms & antonyms        |
| `GET`  | `/v1/word/:word/tenses`            | Verb tenses / inflections  |
| `GET`  | `/v1/word/:word/translations`      | Translations by language   |

### Metadata

| Method | Path             | Description                   |
| ------ | ---------------- | ----------------------------- |
| `GET`  | `/v1/languages`  | Available editions            |
| `GET`  | `/v1/categories` | _(deprecated — returns `[]`)_ |

---

## Database Schema

```sql
CREATE TABLE words (
  id          TEXT PRIMARY KEY,
  word        TEXT NOT NULL,
  edition     TEXT NOT NULL,
  phonetic    TEXT,
  phonetics   TEXT NOT NULL,   -- JSON: PhoneticItem[]
  translations TEXT NOT NULL,  -- JSON: TranslationItem[]
  tenses      TEXT,            -- JSON: Tenses | null
  createdAt   TEXT NOT NULL,
  UNIQUE(word, edition)
);

CREATE TABLE meanings (
  id          TEXT PRIMARY KEY,
  word_id     TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  partOfSpeech TEXT NOT NULL,
  definitions TEXT NOT NULL,   -- JSON: { definition, example? }[]
  translations TEXT NOT NULL,  -- JSON: TranslationItem[]
  synonyms    TEXT,            -- JSON: string[] | null
  antonyms    TEXT,            -- JSON: string[] | null
  sort_order  INTEGER NOT NULL DEFAULT 0
);
```

---

## Production notes

After importing a new database, purge the Cloudflare cache:
**Dashboard → Caching → Purge Everything**
