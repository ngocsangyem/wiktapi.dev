# Self-Hosting

Run your own Wiktapi instance with a single SQLite file. No external services required.

## Prerequisites

- Node.js 22+
- pnpm

## 1. Clone and install

```bash
git clone https://github.com/TheAlexLichter/wiktionary-api
cd wiktionary-api
pnpm install
```

## 2. Download data

Download and decompress JSONL dumps from kaikki.org. The English edition is ~2.3 GB compressed:

```bash
cd packages/api

# English Wiktionary only
pnpm download

# Multiple editions
pnpm download -- --editions en,fr,de

# Re-download even if the file already exists
pnpm download -- --force
```

Files land at `packages/api/data/jsonl/{edition}.jsonl`.

## 3. Import to SQLite

```bash
# Import all downloaded JSONL files
vp run @wiktapi/api#import

# Import a single edition
vp run @wiktapi/api#import -- --edition en

# Drop and recreate the table first (clean import)
vp run @wiktapi/api#import -- --edition en --fresh
```

The database is written to `packages/api/data/wiktionary.db`. The `edition` field is automatically derived from the JSONL filename (e.g., `en.jsonl` → edition `"en"`), enabling you to mix data from multiple Wiktionary editions in a single database.

## 4. Start the server

### Node

```bash
# Development (hot reload)
pnpm dev

# Production build
pnpm build
pnpm preview
```

### Docker

Build the image from the repo root:

```bash
docker build -t wiktapi .
```

Run, mounting the directory that contains `wiktionary.db`:

```bash
docker run -p 3000:3000 -v /path/to/data:/data wiktapi
```

The container expects the database at `/data/wiktionary.db`. Override with `-e DATA_PATH=...` if your file is located elsewhere.

::: tip
Complete steps 2–3 first to produce the database, then point the volume at the directory containing `wiktionary.db`.
:::

The server listens on port 3000 by default.

## Configuration

| Variable    | Default                | Description                      |
| ----------- | ---------------------- | -------------------------------- |
| `DATA_PATH` | `./data/wiktionary.db` | Path to the SQLite database file |
| `PORT`      | `3000`                 | HTTP port                        |

Set environment variables before starting the server:

```bash
DATA_PATH=/var/data/wiktionary.db pnpm preview
```

## Adding words from a new edition

Re-import with a new edition to add words to the database:

```bash
pnpm download -- --editions fr
vp run @wiktapi/api#import -- --edition fr
```

The words from that edition are merged into the existing `words` table with their `edition` field set to `"fr"`. Queries immediately return results for those words. You can now distinguish between English and French entries via the `edition` field in API responses.

## Verifying your instance

```bash
# List all available categories
curl http://localhost:3000/v1/categories

# Look up a word
curl "http://localhost:3000/v1/word/chat"

# Prefix search
curl "http://localhost:3000/v1/search?q=cha"

# Search by category
curl "http://localhost:3000/v1/search?q=sport&category=sports"
```
