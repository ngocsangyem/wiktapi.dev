/**
 * Remove invalid words from the SQLite database.
 *
 * A word is considered invalid when its first character is not a Unicode letter
 * (e.g. "--hehⁿ", "++good", "-", "---", "--.-.").
 *
 * Usage:
 *   vp run @wordictapi/api#cleanup            # dry-run: shows what would be deleted
 *   vp run @wordictapi/api#cleanup -- --execute  # perform the deletion
 *   vp run @wordictapi/api#cleanup -- --db data/wiktionary.db.new  # custom DB path
 */

import Database from "better-sqlite3";
import { resolve } from "node:path";

const DEFAULT_DB_PATH = resolve("./data/wiktionary.db");
const SAMPLE_SIZE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns true when the word's first character is a Unicode letter (any script). */
const startsWithLetter = (word: string): boolean => /^\p{L}/u.test(word);

function parseArgs(): { execute: boolean; dbPath: string } {
  const args = process.argv.slice(2);
  const dbIdx = args.indexOf("--db");
  return {
    execute: args.includes("--execute"),
    dbPath: dbIdx !== -1 ? resolve(args[dbIdx + 1] ?? DEFAULT_DB_PATH) : DEFAULT_DB_PATH,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

const { execute, dbPath } = parseArgs();

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

console.log(`Database: ${dbPath}`);
console.log(`Mode: ${execute ? "EXECUTE (will delete)" : "DRY-RUN (read-only)"}\n`);

// Fetch all words — filter by first-char code ranges covering ASCII punctuation
// (avoids a full table scan with LIKE patterns for each symbol)
const rows = db
  .prepare(
    `SELECT id, word FROM words
     WHERE (unicode(word) BETWEEN 33 AND 47)   -- !"#$%&'()*+,-./
        OR (unicode(word) BETWEEN 58 AND 64)   -- :;<=>?@
        OR (unicode(word) BETWEEN 91 AND 96)   -- [\]^_\`
        OR (unicode(word) BETWEEN 123 AND 126) -- {|}~`,
  )
  .all() as { id: string; word: string }[];

// Secondary JS filter — keep only those that truly don't start with a letter
// (e.g. guard against any edge-case Unicode where code points overlap)
const invalid = rows.filter((r) => !startsWithLetter(r.word));

if (invalid.length === 0) {
  console.log("No invalid words found. Database is clean.");
  db.close();
  process.exit(0);
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`Found ${invalid.length.toLocaleString()} invalid words.\n`);

console.log(`Sample (first ${SAMPLE_SIZE}):`);
invalid.slice(0, SAMPLE_SIZE).forEach((r) => console.log(`  ${JSON.stringify(r.word)}`));
if (invalid.length > SAMPLE_SIZE) {
  console.log(`  … and ${(invalid.length - SAMPLE_SIZE).toLocaleString()} more`);
}

if (!execute) {
  console.log(
    `\nDry-run complete. Run with --execute to delete ${invalid.length.toLocaleString()} words (meanings cascade-deleted automatically).`,
  );
  db.close();
  process.exit(0);
}

// ── Delete ────────────────────────────────────────────────────────────────────

console.log(`\nDeleting ${invalid.length.toLocaleString()} words …`);

const ids = invalid.map((r) => r.id);
const CHUNK = 500; // SQLite IN clause limit

let deleted = 0;
db.transaction(() => {
  for (let i = 0; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const placeholders = chunk.map(() => "?").join(",");
    const { changes } = db.prepare(`DELETE FROM words WHERE id IN (${placeholders})`).run(...chunk);
    deleted += changes;
  }
})();

console.log(`Done — ${deleted.toLocaleString()} words deleted (meanings removed via CASCADE).`);

db.close();
