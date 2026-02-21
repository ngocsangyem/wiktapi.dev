/**
 * Import wiktextract JSONL files into the SQLite database.
 *
 * Usage:
 *   vp run @wiktapi/api#import                                                  # imports all data/jsonl/*.jsonl
 *   vp run @wiktapi/api#import -- --edition en                                  # imports only data/jsonl/en.jsonl
 *   vp run @wiktapi/api#import -- --edition en --fresh                          # drops and recreates the table first
 *   vp run @wiktapi/api#import -- --output data/wiktionary.db.new               # write to a staging file
 *   vp run @wiktapi/api#import -- --output data/wiktionary.db.new --skip-indexes # skip index build (run separately)
 */

import { Effect, Console } from "effect";
import Database from "better-sqlite3";
import { WORDS_TABLE_DDL, WORDS_INDEXES_DDL, WORDS_INSERT_SQL } from "../utils/schema.ts";
import { createReadStream } from "node:fs";
import { readdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import type { Meaning, PhoneticItem, Tenses } from "../utils/types.ts";

const DATA_DIR = resolve("./data");
const JSONL_DIR = resolve(DATA_DIR, "jsonl");
const DEFAULT_DB_PATH = resolve(DATA_DIR, "wiktionary.db");
const BATCH_SIZE = 50_000;

// ── Types ─────────────────────────────────────────────────────────────────────

interface WordRow {
  id: string;
  word: string;
  phonetic: string | null;
  phonetics: string; // JSON: PhoneticItem[]
  meanings: string; // JSON: Meaning[] (one element per POS row)
  category: string;
  translate: string | null;
  tenses: string | null; // JSON: Tenses | null
  createdAt: string;
}

// ── Database setup ───────────────────────────────────────────────────────────

const makeDatabase = (dbPath: string, fresh: boolean) =>
  Effect.acquireRelease(
    Effect.try({
      try: () => {
        const db = new Database(dbPath);
        db.pragma("journal_mode = WAL");
        db.pragma("synchronous = OFF");
        db.pragma("cache_size = -65536"); // 64 MB
        db.pragma("temp_store = MEMORY");
        db.pragma("mmap_size = 268435456"); // 256 MB

        if (fresh) db.exec("DROP TABLE IF EXISTS words");

        db.exec(WORDS_TABLE_DDL);

        return db;
      },
      catch: (e) => new Error(`Failed to open database: ${String(e)}`),
    }),
    (db) => Effect.sync(() => db.close()),
  );

// ── Parsing ───────────────────────────────────────────────────────────────────

function extractPhonetics(sounds: Record<string, unknown>[]): PhoneticItem[] {
  return sounds
    .filter((s) => typeof s.ipa === "string")
    .map((s) => ({
      text: s.ipa as string,
      type: (s.tags as string[] | undefined)?.some((t) => t.toLowerCase() === "us") ? "us" : "uk",
      audioUrl: (s.audio as string | undefined) ?? null,
    }));
}

function extractMeaning(parsed: Record<string, unknown>): Meaning {
  const senses = (parsed.senses as Record<string, unknown>[] | undefined) ?? [];
  const definitions = senses
    .map((s) => {
      const glosses = s.glosses as string[] | undefined;
      const examples = s.examples as Record<string, unknown>[] | undefined;
      return {
        definition: glosses?.[0] ?? "",
        example: examples?.[0]?.text as string | undefined,
      };
    })
    .filter((d) => d.definition);

  return {
    partOfSpeech: (parsed.pos as string | null) ?? "unknown",
    definitions,
    translate: null,
    synonyms: [],
    antonyms: [],
  };
}

function extractTenses(forms: Record<string, unknown>[], baseWord: string): Tenses | null {
  if (forms.length === 0) return null;

  const getForm = (...tags: string[]): string => {
    const match = forms.find((f) => {
      const formTags = (f.tags as string[] | undefined) ?? [];
      return tags.every((t) => formTags.includes(t));
    });
    return (match?.form as string | undefined) ?? "";
  };

  const past = getForm("past");
  const present = getForm("present") || getForm("present", "participle");
  const singular = getForm("singular") || getForm("third-person", "singular", "present");
  const plural = getForm("plural");

  // Only create tenses object if at least one meaningful form exists
  if (!past && !present && !singular && !plural) return null;

  return {
    base: baseWord,
    past,
    present,
    future: "",
    singular,
    plural,
  };
}

function parseWord(line: string): WordRow | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }

  const word = parsed.word as string | undefined;
  if (!word) return null;

  const sounds = (parsed.sounds as Record<string, unknown>[] | undefined) ?? [];
  const forms = (parsed.forms as Record<string, unknown>[] | undefined) ?? [];

  const phonetics = extractPhonetics(sounds);
  const tenses = extractTenses(forms, word);

  return {
    id: crypto.randomUUID(),
    word,
    phonetic: phonetics[0]?.text ?? null,
    phonetics: JSON.stringify(phonetics),
    meanings: JSON.stringify([extractMeaning(parsed)]),
    // TODO: assign category via external classifier — all words default to "general"
    category: "general",
    translate: null,
    tenses: tenses ? JSON.stringify(tenses) : null,
    createdAt: new Date().toISOString(),
  };
}

// ── Import ───────────────────────────────────────────────────────────────────

const importJsonl = (
  db: Database.Database,
  filePath: string,
  label: string,
): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    yield* Console.log(`[${label}] Importing ${filePath} …`);

    const insert = db.prepare(WORDS_INSERT_SQL);

    const insertMany = db.transaction((rows: WordRow[]) => {
      for (const row of rows) insert.run(row);
    });

    const { count, skipped } = yield* Effect.tryPromise({
      try: async () => {
        const rl = createInterface({
          input: createReadStream(filePath, { encoding: "utf-8" }),
          crlfDelay: Infinity,
        });

        let count = 0;
        let skipped = 0;
        const batch: WordRow[] = [];

        try {
          for await (const line of rl) {
            if (!line.trim()) continue;

            const row = parseWord(line);
            if (!row) {
              skipped++;
              continue;
            }

            batch.push(row);

            if (batch.length >= BATCH_SIZE) {
              insertMany(batch);
              count += batch.length;
              batch.length = 0;
              if (count % 50_000 === 0) {
                process.stdout.write(`  ${count.toLocaleString()} rows inserted …\r`);
              }
            }
          }
        } finally {
          rl.close();
        }

        if (batch.length > 0) {
          insertMany(batch);
          count += batch.length;
        }

        return { count, skipped };
      },
      catch: (e) => new Error(`Failed to import ${filePath}: ${String(e)}`),
    });

    yield* Console.log(
      `[${label}] Done — ${count.toLocaleString()} rows inserted, ${skipped} skipped`,
    );
  });

// ── Arg parsing ───────────────────────────────────────────────────────────────

function parseArgs(): {
  targetEdition: string | null;
  fresh: boolean;
  dbPath: string;
  skipIndexes: boolean;
} {
  const args = process.argv.slice(2);
  const editionIdx = args.indexOf("--edition");
  const outputIdx = args.indexOf("--output");
  return {
    targetEdition: editionIdx !== -1 ? (args[editionIdx + 1] ?? null) : null,
    fresh: args.includes("--fresh"),
    skipIndexes: args.includes("--skip-indexes"),
    dbPath: outputIdx !== -1 ? resolve(args[outputIdx + 1] ?? DEFAULT_DB_PATH) : DEFAULT_DB_PATH,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

const main: Effect.Effect<void, Error> = Effect.scoped(
  Effect.gen(function* () {
    const { targetEdition, fresh, dbPath, skipIndexes } = parseArgs();

    if (fresh) yield* Console.log("--fresh: dropping existing words table …");

    const db = yield* makeDatabase(dbPath, fresh);

    let files: { path: string; label: string }[];

    if (targetEdition) {
      files = [{ path: resolve(JSONL_DIR, `${targetEdition}.jsonl`), label: targetEdition }];
    } else {
      const entries = yield* Effect.tryPromise({
        try: () => readdir(JSONL_DIR),
        catch: (e) => new Error(`Failed to read JSONL directory: ${String(e)}`),
      });
      files = entries
        .filter((f) => f.endsWith(".jsonl"))
        .map((f) => ({ path: resolve(JSONL_DIR, f), label: f.replace(/\.jsonl$/, "") }));
    }

    if (files.length === 0) {
      yield* Effect.fail(
        new Error("No JSONL files found. Run `vp run @wiktapi/api#download` first."),
      );
    }

    yield* Effect.forEach(
      files,
      ({ path, label }) =>
        Effect.gen(function* () {
          yield* importJsonl(db, path, label);
          yield* Effect.tryPromise({
            try: () => unlink(path),
            catch: (e) => new Error(`Failed to delete ${path}: ${String(e)}`),
          });
          yield* Console.log(`[${label}] Deleted ${path}`);
        }),
      { concurrency: 1 },
    );

    if (skipIndexes) {
      yield* Console.log("\nSkipping indexes (run `vp run @wiktapi/api#index` separately).");
    } else {
      yield* Console.log("\nBuilding indexes …");
      db.exec(WORDS_INDEXES_DDL);
    }

    const { count } = db.prepare("SELECT COUNT(*) AS count FROM words").get() as {
      count: number;
    };
    yield* Console.log(`\nDatabase ready at ${dbPath} — ${count.toLocaleString()} total words`);
    yield* Console.log(
      "\nReminder: purge the Cloudflare cache so clients get fresh data (dashboard → Caching → Purge Everything).",
    );
  }),
);

Effect.runPromise(main).catch((err) => {
  console.error(err);
  process.exit(1);
});
