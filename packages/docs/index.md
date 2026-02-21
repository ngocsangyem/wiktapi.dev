---
layout: home
hero:
  name: Wiktapi
  tagline: Multilingual dictionary API
  image:
    src: /favicon.svg
    alt: Wiktapi
  actions:
    - theme: brand
      text: Quickstart
      link: /quickstart
    - theme: alt
      text: API Explorer
      link: https://api.wiktapi.dev/_scalar
features:
  - title: 100+ Languages
    details: Access entries from multiple Wiktionary editions. Each word includes an edition field identifying its source language (e.g., "en", "fr", "de"). Combine editions in a single database.
  - title: Structured JSON
    details: No HTML blobs. Clean, consistent JSON with definitions, translations, pronunciations, and inflected forms.
  - title: Open & Self-Hostable
    details: Run your own instance with a single SQLite file. Including the import scripts to build it from scratch on any Wiktionary edition.
---

## Why Wiktapi?

The only official Wiktionary API ([`en.wiktionary.org/api/rest_v1/`](https://en.wiktionary.org/api/rest_v1/)) returns HTML fragments. Getting glosses, examples, pronunciations, or translations out means parsing HTML. It's fragile and painful.

Wiktapi gives you **structured JSON** with normalized fields for every word:

- Phonetics (IPA + audio)
- Meanings organized by part of speech
- Translations
- Inflected forms and tenses
- Semantic categories (technology, sports, food, etc.)

The data comes from [kaikki.org](https://kaikki.org/dictionary/rawdata.html), which pre-processes wiktextract JSONL for every Wiktionary edition. No scraping, no HTML parsing, no Python toolchain.
