/**
 * Import wiktextract JSONL files into the SQLite database.
 *
 * Usage:
 *   vp run @wordictapi/api#import                                                  # imports all data/jsonl/*.jsonl
 *   vp run @wordictapi/api#import -- --edition en                                  # imports only data/jsonl/en.jsonl
 *   vp run @wordictapi/api#import -- --edition en --fresh                          # drops and recreates the tables first
 *   vp run @wordictapi/api#import -- --output data/wiktionary.db.new               # write to a staging file
 *   vp run @wordictapi/api#import -- --output data/wiktionary.db.new --skip-indexes # skip index build (run separately)
 */

import { Effect, Console } from "effect";
import Database from "better-sqlite3";
import {
  WORDS_TABLE_DDL,
  MEANINGS_TABLE_DDL,
  WORDS_INDEXES_DDL,
  MEANINGS_INDEXES_DDL,
  MEANINGS_INSERT_SQL,
} from "../utils/schema.ts";
import { createReadStream, statSync } from "node:fs";
import { readdir, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { createInterface } from "node:readline";
import type { Meaning, PhoneticItem, Tenses, TranslationItem } from "../utils/types.ts";

const DATA_DIR = resolve("./data");
const JSONL_DIR = resolve(DATA_DIR, "jsonl");
const DEFAULT_DB_PATH = resolve(DATA_DIR, "wiktionary.db");
const BATCH_SIZE = 5_000; // number of word groups per batch transaction

// ── Types ─────────────────────────────────────────────────────────────────────

/** One JSONL line parsed into a single POS entry (before grouping). */
interface ParsedEntry {
  word: string;
  edition: string;
  phonetic: string | null;
  phonetics: string; // JSON: PhoneticItem[]
  meaning: Meaning; // single POS meaning
  translations: string; // JSON: TranslationItem[] for this POS
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
        db.pragma("foreign_keys = ON");

        if (fresh) {
          // Drop in FK-safe order: meanings first, then words
          db.exec("DROP TABLE IF EXISTS meanings");
          db.exec("DROP TABLE IF EXISTS words");
        }

        db.exec(WORDS_TABLE_DDL);
        db.exec(MEANINGS_TABLE_DDL);

        return db;
      },
      catch: (e) => new Error(`Failed to open database: ${String(e)}`),
    }),
    (db) => Effect.sync(() => db.close()),
  );

// ── Parsing ───────────────────────────────────────────────────────────────────

/** Normalizes IPA text to always use /phonemic/ slash delimiters. */
function normalizeIpa(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return `/${trimmed.slice(1, -1)}/`;
  }
  if (!trimmed.startsWith("/")) return `/${trimmed}/`;
  return trimmed;
}

function extractPhonetics(sounds: Record<string, unknown>[]): PhoneticItem[] {
  return sounds
    .filter((s) => typeof s.ipa === "string")
    .map((s) => ({
      text: normalizeIpa(s.ipa as string),
      type: (s.tags as string[] | undefined)?.some((t) => t.toLowerCase() === "us") ? "us" : "uk",
      audioUrl: (s.audio as string | undefined) ?? null,
    }));
}

/** Extracts word strings from a LinkageData[] array (wiktextract format). */
function extractLinkageWords(items: unknown): string[] {
  const arr = (items as { word?: string }[] | undefined) ?? [];
  return arr.map((item) => item.word ?? "").filter(Boolean);
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

  const synonyms = [
    ...extractLinkageWords(parsed.synonyms),
    ...senses.flatMap((s) => extractLinkageWords(s.synonyms)),
  ];
  const antonyms = [
    ...extractLinkageWords(parsed.antonyms),
    ...senses.flatMap((s) => extractLinkageWords(s.antonyms)),
  ];

  return {
    partOfSpeech: (parsed.pos as string | null) ?? "unknown",
    definitions,
    translations: [], // stored per-entry via extractTranslations
    synonyms: [...new Set(synonyms)],
    antonyms: [...new Set(antonyms)],
  };
}

/**
 * Extracts translation items from a wiktextract JSONL entry.
 * Translations live at the POS-entry level.
 */
function extractTranslations(parsed: Record<string, unknown>): TranslationItem[] {
  const pos = (parsed.pos as string | null) ?? "unknown";
  const raw = (parsed.translations as Record<string, unknown>[] | undefined) ?? [];
  return raw
    .filter((t) => typeof t.word === "string" && typeof t.lang_code === "string")
    .map((t) => ({
      partOfSpeech: pos,
      lang_code: t.lang_code as string,
      code: t.lang_code as string,
      lang: (t.lang as string | undefined) ?? "",
      word: t.word as string,
    }));
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

  if (!past && !present && !singular && !plural) return null;

  return { base: baseWord, past, present, future: "", singular, plural };
}

/** Words whose first character is not a Unicode letter are skipped (e.g. "--hehⁿ", "++good", "---"). */
const STARTS_WITH_LETTER_REGEX = /^\p{L}/u;
/** Matches any digit — words containing numbers are skipped entirely. */
const CONTAINS_DIGIT_REGEX = /\d/;
/** Matches special characters that never appear in valid dictionary headwords. */
const SPECIAL_CHAR_REGEX = /[~!@#$%^&*()`<>|\\[\]{};:'"<>,/?]/;

function shouldSkipWord(word: string): boolean {
  if (!word || word.trim() === "") return true;
  if (!STARTS_WITH_LETTER_REGEX.test(word)) return true;
  if (CONTAINS_DIGIT_REGEX.test(word)) return true;
  if (SPECIAL_CHAR_REGEX.test(word)) return true;
  return false;
}

function parseLine(line: string, edition: string): ParsedEntry | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }

  const rawWord = parsed.word as string | undefined;
  if (!rawWord || shouldSkipWord(rawWord)) return null;

  // Normalize to lowercase for consistent storage and lookup
  const word = rawWord.toLowerCase();

  const sounds = (parsed.sounds as Record<string, unknown>[] | undefined) ?? [];
  const forms = (parsed.forms as Record<string, unknown>[] | undefined) ?? [];

  const phonetics = extractPhonetics(sounds);
  const tenses = extractTenses(forms, word);

  return {
    word,
    edition,
    phonetic: phonetics[0]?.text ?? null,
    phonetics: JSON.stringify(phonetics),
    meaning: extractMeaning(parsed),
    translations: JSON.stringify(extractTranslations(parsed)),
    tenses: tenses ? JSON.stringify(tenses) : null,
    createdAt: new Date().toISOString(),
  };
}

// ── Import ───────────────────────────────────────────────────────────────────

const importJsonl = (
  db: Database.Database,
  filePath: string,
  label: string,
  edition: string,
): Effect.Effect<void, Error> =>
  Effect.gen(function* () {
    const fileSizeMb = (statSync(filePath).size / 1_048_576).toFixed(0);
    yield* Console.log(`[${label}] Importing ${filePath} (${fileSizeMb} MB) …`);

    // INSERT OR IGNORE: silently skip if (word, edition) already exists in DB.
    // This handles both case-normalization collisions within the same file and
    // re-runs against a partially-imported database.
    const insertWordStmt = db.prepare(`
      INSERT OR IGNORE INTO words (id, word, edition, phonetic, phonetics, translations, tenses, createdAt)
      VALUES (@id, @word, @edition, @phonetic, @phonetics, @translations, @tenses, @createdAt)
    `);
    // Fallback: resolve the actual row ID when INSERT was skipped due to conflict.
    const selectWordIdStmt = db.prepare(
      `SELECT id FROM words WHERE word = @word AND edition = @edition`,
    );
    // Resolve the current meaning count for words that pre-exist in the DB so
    // sort_order continues from the correct offset on incremental imports.
    const countMeaningsStmt = db.prepare(
      `SELECT COUNT(*) AS cnt FROM meanings WHERE word_id = @word_id`,
    );
    const insertMeaning = db.prepare(MEANINGS_INSERT_SQL);

    // In-memory cache: avoids repeated SELECT lookups for the same word within
    // one file (e.g. "Chat" and "chat" both normalize to "chat").
    const wordCache = new Map<string, { id: string; meaningCount: number }>();

    /**
     * Flush a group of entries for the same word into the DB (called inside a transaction).
     * Returns true only when a brand-new word row was inserted in this run.
     */
    function flushWordGroup(entries: ParsedEntry[]): boolean {
      const first = entries[0]!;
      const cacheKey = `${first.word}|${first.edition}`;
      let cached = wordCache.get(cacheKey);
      let freshInsert = false;

      if (!cached) {
        const wordId = crypto.randomUUID();
        // Aggregate all per-POS translations for the word-level field
        const allTranslations = entries.flatMap((e) => JSON.parse(e.translations) as unknown[]);

        const { changes } = insertWordStmt.run({
          id: wordId,
          word: first.word,
          edition: first.edition,
          phonetic: first.phonetic,
          phonetics: first.phonetics,
          translations: JSON.stringify(allTranslations),
          tenses: first.tenses,
          createdAt: first.createdAt,
        });

        if (changes > 0) {
          // Newly inserted — use the UUID we just generated
          cached = { id: wordId, meaningCount: 0 };
          freshInsert = true;
        } else {
          // Row already existed (prior run or same-file collision) — look up real ID
          const row = selectWordIdStmt.get({ word: first.word, edition: first.edition }) as {
            id: string;
          };
          const { cnt } = countMeaningsStmt.get({ word_id: row.id }) as { cnt: number };
          cached = { id: row.id, meaningCount: cnt };
        }
        wordCache.set(cacheKey, cached);
      }

      entries.forEach((entry, index) => {
        insertMeaning.run({
          id: crypto.randomUUID(),
          word_id: cached!.id,
          partOfSpeech: entry.meaning.partOfSpeech,
          definitions: JSON.stringify(entry.meaning.definitions),
          translations: entry.translations,
          synonyms: entry.meaning.synonyms?.length ? JSON.stringify(entry.meaning.synonyms) : null,
          antonyms: entry.meaning.antonyms?.length ? JSON.stringify(entry.meaning.antonyms) : null,
          sort_order: cached!.meaningCount + index,
        });
      });

      cached.meaningCount += entries.length;
      return freshInsert;
    }

    const { wordCount, meaningCount, skipped, linesRead } = yield* Effect.tryPromise({
      try: async () => {
        const rl = createInterface({
          input: createReadStream(filePath, { encoding: "utf-8" }),
          crlfDelay: Infinity,
        });

        let wordCount = 0;
        let meaningCount = 0;
        let skipped = 0;
        let linesRead = 0;
        let lastProgressAt = 0;

        let currentWord: string | null = null;
        let wordBuffer: ParsedEntry[] = [];
        // Batch of word groups to commit in one transaction
        const batchBuffer: ParsedEntry[][] = [];

        function commitBatch(): void {
          db.transaction(() => {
            for (const group of batchBuffer) {
              const isNew = flushWordGroup(group);
              if (isNew) wordCount++;
              meaningCount += group.length;
            }
          })();
          batchBuffer.length = 0;
          if (wordCount - lastProgressAt >= 10_000) {
            lastProgressAt = wordCount;
            process.stdout.write(
              `  read ${linesRead.toLocaleString()} lines | ${wordCount.toLocaleString()} words | ${meaningCount.toLocaleString()} meanings | ${skipped.toLocaleString()} skipped\r`,
            );
          }
        }

        try {
          for await (const line of rl) {
            linesRead++;
            if (!line.trim()) continue;

            const entry = parseLine(line, edition);
            if (!entry) {
              skipped++;
              continue;
            }

            if (currentWord !== null && entry.word !== currentWord) {
              // Word changed — queue the completed group
              if (wordBuffer.length > 0) {
                batchBuffer.push(wordBuffer);
                wordBuffer = [];
              }
              if (batchBuffer.length >= BATCH_SIZE) {
                commitBatch();
              }
            } else if (currentWord !== null && entry.word === currentWord) {
              // Sanity check: if word re-appears after a different word was seen, warn
            }

            currentWord = entry.word;
            wordBuffer.push(entry);
          }
        } finally {
          rl.close();
        }

        // Flush last word group
        if (wordBuffer.length > 0) {
          batchBuffer.push(wordBuffer);
        }
        if (batchBuffer.length > 0) {
          commitBatch();
        }

        return { wordCount, meaningCount, skipped, linesRead };
      },
      catch: (e) => new Error(`Failed to import ${filePath}: ${String(e)}`),
    });

    yield* Console.log(
      `[${label}] Done — ${linesRead.toLocaleString()} lines read | ${wordCount.toLocaleString()} words, ${meaningCount.toLocaleString()} meanings inserted, ${skipped.toLocaleString()} skipped`,
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

    if (fresh) yield* Console.log("--fresh: dropping existing tables …");

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
        new Error("No JSONL files found. Run `vp run @wordictapi/api#download` first."),
      );
    }

    yield* Effect.forEach(
      files,
      ({ path, label }) =>
        Effect.gen(function* () {
          yield* importJsonl(db, path, label, label);
          yield* Effect.tryPromise({
            try: () => unlink(path),
            catch: (e) => new Error(`Failed to delete ${path}: ${String(e)}`),
          });
          yield* Console.log(`[${label}] Deleted ${path}`);
        }),
      { concurrency: 1 },
    );

    if (skipIndexes) {
      yield* Console.log("\nSkipping indexes (run `vp run @wordictapi/api#index` separately).");
    } else {
      yield* Console.log("\nBuilding indexes …");
      db.exec(WORDS_INDEXES_DDL);
      db.exec(MEANINGS_INDEXES_DDL);
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
