# Data Pipeline

Wiktapi is powered by [kaikki.org](https://kaikki.org/dictionary/rawdata.html), which publishes pre-processed JSONL dumps of every Wiktionary edition. No Python toolchain or wikitext parsing required.

## Overview

```
kaikki.org (JSONL.gz, ~2 GB compressed)
        ↓  scripts/download_kaikki.ts
data/jsonl/{edition}.jsonl
        ↓  scripts/import_data.ts
data/wiktionary.db  (indexed SQLite)
        ↓  runtime
Nitro API server
```

The pipeline runs out-of-band (manually or in CI) whenever kaikki.org publishes updated extracts, roughly monthly. The API server is read-only and stateless at runtime.

## Database schema

All words are stored in a single `words` table with normalized JSON columns:

```sql
CREATE TABLE words (
    id        TEXT PRIMARY KEY,          -- UUID or nanoid
    word      TEXT NOT NULL,             -- the headword
    phonetic  TEXT,                      -- primary phonetic string (IPA)
    phonetics TEXT NOT NULL,             -- JSON: PhoneticItem[]
    meanings  TEXT NOT NULL,             -- JSON: Meaning[]
    category  TEXT NOT NULL,             -- WordCategory enum value
    translate TEXT,                      -- simple translation
    tenses    TEXT,                      -- JSON: Tenses object or null
    createdAt TEXT NOT NULL              -- ISO 8601 timestamp
);
```

Structured data (phonetics, meanings, tenses) is stored as JSON, allowing flexible querying while maintaining type safety through TypeScript interfaces.

## Mapped from wiktextract

| Source Field           | Target Column/Field        |
| ---------------------- | -------------------------- |
| `word`                 | `word`                     |
| `sounds[].ipa`         | `phonetic` + `phonetics[]` |
| `senses` + `pos`       | `meanings[].definitions`   |
| `senses[].glosses`     | `meanings[].definitions[]` |
| `translations[]`       | `meanings[].translate`     |
| `forms[]`              | `tenses` object            |
| _(inferred or tagged)_ | `category`                 |

The import script parses kaikki.org JSONL and transforms nested wiktextract objects into the normalized schema.

## Caching

Route-level `Cache-Control` headers are set automatically:

| Route            | `max-age`                               |
| ---------------- | --------------------------------------- |
| `/v1/word/**`    | 24 hours + 7-day stale-while-revalidate |
| `/v1/search`     | 1 hour                                  |
| `/v1/categories` | 24 hours                                |

Data only changes when a new import runs, so long TTLs are appropriate.
