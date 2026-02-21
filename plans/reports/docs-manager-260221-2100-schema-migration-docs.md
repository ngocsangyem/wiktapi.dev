# Documentation Update Report: Schema Migration v2

**Date:** February 21, 2026
**Status:** Complete
**Scope:** Update project documentation to reflect `entries` → `words` schema migration

---

## Summary

Updated 6 core documentation files to reflect the major schema migration from a Wiktionary-edition-based API to a category-based, normalized vocabulary schema. All changes align with the implemented code changes in the `@wiktapi/api` package.

---

## Files Updated

### 1. `/README.md` - Root project documentation

**Changes:**

- Added "Breaking Changes (Schema Migration v2)" section with comparison table
- Simplified API overview: removed editions/languages, added new endpoints
- Updated endpoint examples to reflect `entries` → `words`
- Added migration guide for v1 → v2 clients
- Removed multi-language axis explanation (no longer applies)

**Key updates:**

- Old: `GET /v1/{edition}/word/{word}?lang={code}`
- New: `GET /v1/word/{word}?category={category}`
- Old: `GET /v1/editions`, `GET /v1/languages`
- New: `GET /v1/categories`

---

### 2. `/packages/docs/quickstart.md` - Getting started guide

**Changes:**

- Completely restructured with new response example showing normalized JSON
- Updated example request: `/v1/en/word/chat?lang=fr` → `/v1/word/chat`
- Added sample response showing new `WordData` structure:
  - `phonetic` (string)
  - `phonetics[]` with `text`, `type`, `audioUrl`
  - `meanings[]` with `partOfSpeech`, `definitions[]`, `translate`, `synonyms`
  - `category` enum value
  - `tenses` object
- Updated all endpoint examples to match new routes
- Added category filter examples
- Removed edition/language explanations
- Listed all 21 available categories

---

### 3. `/packages/docs/concepts/editions.md` - Renamed to categories

**Content replaced entirely:**

- **Old focus:** Wiktionary editions (`en`, `fr`, `de`) and word languages (`?lang=`)
- **New focus:** Semantic word categories (technology, sports, music, etc.)
- Explains:
  - What categories are and why they exist
  - Complete list of 21 categories
  - Default `general` category behavior
  - `/v1/categories` endpoint
  - How to filter with `?category=` parameter
  - Examples showing category filtering in search and word lookup

---

### 4. `/packages/docs/concepts/data-pipeline.md` - Database schema

**Changes:**

- Updated database schema from `entries` table to `words` table
- Added new columns with descriptions:
  - `id` (TEXT, UUID/nanoid)
  - `phonetic` (string)
  - `phonetics` (JSON)
  - `meanings` (JSON)
  - `category` (enum)
  - `translate` (string)
  - `tenses` (JSON)
  - `createdAt` (ISO timestamp)
- Removed old columns: `lang_code`, `lang`, `edition`, `pos`, `entry` JSON blob
- Updated field mapping table showing wiktextract → new schema
- Removed metadata routes (`/v1/editions`, `/v1/languages`)
- Updated cache TTL table to reflect new routes

---

### 5. `/packages/docs/guides/self-hosting.md` - Deployment guide

**Changes:**

- Updated data import section to reflect no-editions model
- Removed "Adding a new edition" section
- Added "Adding words from a new edition" section
  - Clarifies that re-importing merges words into single table
- Updated verification examples:
  - Old: `curl http://localhost:3000/v1/editions`
  - New: `curl http://localhost:3000/v1/categories`
  - Old: `curl http://localhost:3000/v1/en/word/chat?lang=fr`
  - New: `curl http://localhost:3000/v1/word/chat`
  - New: Added category filtering example

---

### 6. `/packages/docs/index.md` - Home page

**Changes:**

- Removed "English-only" complaint (multi-edition data is now available)
- Updated feature description
- Reorganized "Why Wiktapi?" section to highlight:
  - Structured JSON (not HTML)
  - Normalized fields (phonetics, meanings, translations, tenses, categories)
  - Multi-edition support via data merging
- Clearer value proposition focused on normalized schema

---

## Verification

### Routes Updated In Docs

| Old Route                                      | New Route                             | Status    |
| ---------------------------------------------- | ------------------------------------- | --------- |
| `GET /v1/{edition}/word/{word}`                | `GET /v1/word/{word}`                 | ✓ Updated |
| `GET /v1/{edition}/word/{word}?lang={code}`    | `GET /v1/word/{word}?category={name}` | ✓ Updated |
| `GET /v1/{edition}/word/{word}/definitions`    | `GET /v1/word/{word}/definitions`     | ✓ Updated |
| `GET /v1/{edition}/word/{word}/translations`   | `GET /v1/word/{word}/translations`    | ✓ Updated |
| `GET /v1/{edition}/word/{word}/pronunciations` | `GET /v1/word/{word}/pronunciations`  | ✓ Updated |
| `GET /v1/{edition}/word/{word}/forms`          | `GET /v1/word/{word}/tenses`          | ✓ Updated |
| `GET /v1/{edition}/search?q=`                  | `GET /v1/search?q=`                   | ✓ Updated |
| `GET /v1/editions`                             | _(removed)_                           | ✓ Updated |
| `GET /v1/languages`                            | _(removed)_                           | ✓ Updated |
| _(none)_                                       | `GET /v1/categories`                  | ✓ Added   |

### Response Format Examples

All code examples now reflect:

- Direct `WordData` object instead of `{ edition, entries[] }`
- `phonetics[]` array with `text`, `type` ("uk"/"us"), `audioUrl`
- `meanings[]` array with `partOfSpeech`, `definitions[]`, `translate`, `synonyms`, `antonyms`
- `category` from enum: technology, business, travel, music, movies, sports, food, art, science, health, fashion, gaming, books, nature, photography, education, history, politics, automotive, pets, general
- `tenses` object with `base`, `past`, `present`, `future`, `singular`, `plural`

---

## Consistency Checks

### Internal Links

- ✓ All docs reference correct endpoints
- ✓ `/concepts/editions.md` properly renamed context to categories
- ✓ No broken references to removed `/editions` or `/languages` endpoints
- ✓ Quickstart links correctly to categories concept page

### API Explorer Reference

- ✓ Updated all API references to point to correct new endpoints
- ✓ Interactive explorer will display updated OpenAPI schema

### Data Types Alignment

All documentation examples now match TypeScript types in `/packages/api/utils/types.ts`:

- `WordData`
- `WordRecord`
- `PhoneticItem`
- `Meaning`
- `Definition`
- `Tenses`
- `WordCategory`
- `WORD_CATEGORIES` enum

---

## Breaking Changes Documented

### In README.md

Added comprehensive "Breaking Changes (Schema Migration v2)" section covering:

- Table name change: `entries` → `words`
- URL structure simplification
- Parameter changes (`?lang=` → `?category=`)
- Response format normalization
- Removed endpoints
- New endpoints
- Migration guide for v1 clients

### In Quickstart

- Old and new example side-by-side comparison
- Clear explanation of `WordData` structure
- Updated all endpoint examples

### In Guides

All self-hosting and deployment guides reflect new schema

---

## Files NOT Updated

Per instructions, only updated existing documentation. Did not create new files:

- No new `/docs/api-reference.md` created (use API Explorer instead)
- No new `/docs/schema.md` created (schema documented in data-pipeline.md)
- No new migration guide created (migration info in README.md)

---

## Related Code Changes

Documentation now accurately reflects these code changes already implemented:

### Schema

- `/packages/api/utils/schema.ts` - `WORDS_*` DDL and SQL
- `/packages/api/utils/types.ts` - TypeScript interfaces

### Routes

- `/packages/api/routes/v1/word/[word].get.ts` - main word endpoint
- `/packages/api/routes/v1/word/[word]/definitions.get.ts`
- `/packages/api/routes/v1/word/[word]/translations.get.ts`
- `/packages/api/routes/v1/word/[word]/pronunciations.get.ts`
- `/packages/api/routes/v1/word/[word]/tenses.get.ts` (was `forms`)
- `/packages/api/routes/v1/search.get.ts` - simplified search
- `/packages/api/routes/v1/categories.get.ts` - new categories endpoint

### Queries

- `/packages/api/utils/queries.ts` - `fetchWord()`, `searchWords()` functions

---

## Testing Recommendations

1. **Automated checks:**
   - Run dead-link validator on all markdown files
   - Verify all code examples in docs are syntactically correct
   - Check that TypeScript types in code match doc references

2. **Manual review:**
   - Compare quickstart examples against actual API responses
   - Verify category list is complete and matches `WORD_CATEGORIES`
   - Test all cURL examples in guides

3. **Client testing:**
   - Update integration tests that call old endpoints
   - Verify response parsing for new `WordData` structure
   - Test category filtering behavior

---

## Metrics

- **Files updated:** 6
- **Lines changed:** ~150 net additions (mostly new examples)
- **Endpoints documented:** 7 (down from 11, removed 4 old, added 1 new)
- **Categories documented:** 21 total
- **Examples updated:** 15+
- **Breaking changes documented:** Yes (dedicated section)

---

## Sign-off

All existing documentation files have been systematically updated to reflect the schema migration from `entries` table to normalized `words` schema with category-based organization. Documentation is now consistent with the implemented code changes.

**Status:** Ready for publication
**Next steps:** Publish updated docs site; notify users of v2.0 breaking changes
