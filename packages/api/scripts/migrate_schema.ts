/**
 * One-time migration: collapse 1:1 words table (1 row per POS) into
 * normalized 1:N schema (words + meanings tables).
 *
 * Usage:
 *   vp run @wordictapi/api#migrate                          # migrates default data/wiktionary.db
 *   vp run @wordictapi/api#migrate -- ./data/custom.db     # migrates a specific file
 *
 * Safety:
 *   - Backs up DB to <path>.bak before touching anything
 *   - Idempotent: exits early if meanings table already exists
 *   - All inserts wrapped in a single transaction (atomic swap)
 */

import Database from "better-sqlite3";
import { copyFileSync } from "node:fs";
import { resolve } from "node:path";

const DB_PATH = resolve(process.argv[2] ?? "./data/wiktionary.db");
const BACKUP_PATH = DB_PATH + ".bak";

// ── Backup ────────────────────────────────────────────────────────────────────

console.log(`Backing up ${DB_PATH} → ${BACKUP_PATH} …`);
copyFileSync(DB_PATH, BACKUP_PATH);
console.log("Backup complete.");

// ── Open DB ───────────────────────────────────────────────────────────────────

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = OFF"); // must be OFF during table rename

// ── Idempotency check ─────────────────────────────────────────────────────────

const alreadyMigrated = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='meanings'")
  .get();

if (alreadyMigrated) {
  console.log("Already migrated (meanings table exists). Exiting.");
  db.close();
  process.exit(0);
}

// ── Migration ─────────────────────────────────────────────────────────────────

console.log("Starting migration …");

let wordCount = 0;
let meaningCount = 0;

db.transaction(() => {
  // Create staging tables
  db.exec(`
    CREATE TABLE words_new (
      id           TEXT PRIMARY KEY,
      word         TEXT NOT NULL,
      edition      TEXT NOT NULL,
      phonetic     TEXT,
      phonetics    TEXT NOT NULL,
      translations TEXT NOT NULL,
      tenses       TEXT,
      createdAt    TEXT NOT NULL,
      UNIQUE(word, edition)
    )
  `);

  db.exec(`
    CREATE TABLE meanings_new (
      id           TEXT PRIMARY KEY,
      word_id      TEXT NOT NULL,
      partOfSpeech TEXT NOT NULL,
      definitions  TEXT NOT NULL,
      translations TEXT NOT NULL,
      synonyms     TEXT,
      antonyms     TEXT,
      sort_order   INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Get all distinct (word, edition) groups — category removed
  type GroupKey = { word: string; edition: string };
  const groups = db
    .prepare("SELECT DISTINCT word, edition FROM words ORDER BY word, edition")
    .all() as GroupKey[];

  console.log(`Found ${groups.length.toLocaleString()} distinct (word, edition) groups …`);

  type OldRow = {
    id: string;
    word: string;
    edition: string;
    phonetic: string | null;
    phonetics: string;
    meanings: string;
    translations: string;
    tenses: string | null;
    createdAt: string;
  };

  const selectGroup = db.prepare(
    "SELECT * FROM words WHERE word = ? AND edition = ? ORDER BY rowid",
  );
  const insertWord = db.prepare(`
    INSERT INTO words_new (id, word, edition, phonetic, phonetics, translations, tenses, createdAt)
    VALUES (@id, @word, @edition, @phonetic, @phonetics, @translations, @tenses, @createdAt)
  `);
  const insertMeaning = db.prepare(`
    INSERT INTO meanings_new (id, word_id, partOfSpeech, definitions, translations, synonyms, antonyms, sort_order)
    VALUES (@id, @word_id, @partOfSpeech, @definitions, @translations, @synonyms, @antonyms, @sort_order)
  `);

  for (const { word, edition } of groups) {
    const rows = selectGroup.all(word, edition) as OldRow[];
    if (rows.length === 0) continue;

    // Preserve first row's UUID as canonical word ID
    const wordId = rows[0]!.id;
    // Pick phonetics from first row with non-null phonetic, fallback to first row
    const canonicalRow = rows.find((r) => r.phonetic !== null) ?? rows[0]!;

    // Aggregate all per-POS translations into the word-level field
    const allTranslations = rows.flatMap((r) => {
      try {
        return JSON.parse(r.translations) as unknown[];
      } catch {
        return [];
      }
    });

    insertWord.run({
      id: wordId,
      word,
      edition,
      phonetic: canonicalRow.phonetic,
      phonetics: canonicalRow.phonetics,
      translations: JSON.stringify(allTranslations),
      tenses: canonicalRow.tenses,
      createdAt: canonicalRow.createdAt,
    });
    wordCount++;

    // Each old row has a meanings JSON array (usually 1 element per POS)
    rows.forEach((row, rowIndex) => {
      let meanings: {
        partOfSpeech?: string;
        definitions?: unknown[];
        synonyms?: string[];
        antonyms?: string[];
      }[];
      try {
        meanings = JSON.parse(row.meanings);
      } catch {
        meanings = [];
      }

      let perRowTranslations: unknown[];
      try {
        perRowTranslations = JSON.parse(row.translations);
      } catch {
        perRowTranslations = [];
      }

      meanings.forEach((meaning, meaningIndex) => {
        insertMeaning.run({
          id: crypto.randomUUID(),
          word_id: wordId,
          partOfSpeech: meaning.partOfSpeech ?? "unknown",
          definitions: JSON.stringify(meaning.definitions ?? []),
          translations: JSON.stringify(perRowTranslations),
          synonyms: meaning.synonyms?.length ? JSON.stringify(meaning.synonyms) : null,
          antonyms: meaning.antonyms?.length ? JSON.stringify(meaning.antonyms) : null,
          sort_order: rowIndex * 100 + meaningIndex, // stable ordering
        });
        meaningCount++;
      });
    });

    if (wordCount % 50_000 === 0) {
      process.stdout.write(`  ${wordCount.toLocaleString()} words migrated …\r`);
    }
  }

  // Atomic table swap
  db.exec("DROP TABLE words");
  db.exec("ALTER TABLE words_new RENAME TO words");
  db.exec("ALTER TABLE meanings_new RENAME TO meanings");

  // Rebuild indexes
  db.exec("CREATE INDEX IF NOT EXISTS idx_word ON words (word)");
  db.exec("CREATE INDEX IF NOT EXISTS idx_meanings_word_id ON meanings (word_id)");

  console.log(
    `\nMigration complete: ${wordCount.toLocaleString()} words, ${meaningCount.toLocaleString()} meanings`,
  );
})();

// ── Verify ────────────────────────────────────────────────────────────────────

db.pragma("foreign_keys = ON");

const { wc } = db.prepare("SELECT COUNT(*) AS wc FROM words").get() as { wc: number };
const { mc } = db.prepare("SELECT COUNT(*) AS mc FROM meanings").get() as { mc: number };

console.log(`Verified: ${wc.toLocaleString()} words, ${mc.toLocaleString()} meanings in DB`);

if (wc !== wordCount || mc !== meaningCount) {
  console.warn(`WARNING: count mismatch — expected ${wordCount}/${meaningCount}, got ${wc}/${mc}`);
}

db.close();
console.log("Done.");
