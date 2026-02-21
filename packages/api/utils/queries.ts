import { HTTPError } from "nitro/h3";
import { db } from "./db.ts";
import type {
  Meaning,
  PhoneticItem,
  Tenses,
  TranslationItem,
  WordCategory,
  WordRecord,
} from "./types.ts";

interface WordRow {
  id: string;
  word: string;
  edition: string;
  phonetic: string | null;
  phonetics: string;
  meanings: string;
  category: string;
  translations: string; // JSON: TranslationItem[]
  tenses: string | null;
  createdAt: string;
}

function safeParseJson<T>(json: string, context: string): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    throw new HTTPError({
      statusCode: 500,
      message: `Malformed JSON in column "${context}"`,
    });
  }
}

/**
 * Merges multiple rows for the same word into a single WordRecord.
 *
 * Invariant: all rows must share the same word, category, translate, phonetic,
 * phonetics, tenses, and createdAt values — only `meanings` differs per row
 * (one POS per row). This is guaranteed by the import script, which writes
 * identical scalar fields for every row of the same word.
 */
function mergeRows(rows: WordRow[]): WordRecord {
  const first = rows[0]!;
  const allMeanings = rows.flatMap((r) => safeParseJson<Meaning[]>(r.meanings, "meanings"));

  // Pick phonetics from the first row that actually has them; fall back to first row
  const phoneticRow = rows.find((r) => r.phonetic !== null) ?? first;

  return {
    id: first.id,
    word: first.word,
    edition: first.edition,
    phonetic: phoneticRow.phonetic,
    phonetics: safeParseJson<PhoneticItem[]>(phoneticRow.phonetics, "phonetics"),
    meanings: allMeanings,
    category: first.category as WordCategory,
    translations: rows.flatMap((r) =>
      safeParseJson<TranslationItem[]>(r.translations, "translations"),
    ),
    tenses: first.tenses ? safeParseJson<Tenses>(first.tenses, "tenses") : undefined,
    createdAt: first.createdAt,
  };
}

/**
 * Fetch all rows for a word, merge their meanings into a single WordRecord.
 * Throws 404 if no rows found.
 */
export function fetchWord(word: string, category?: string): WordRecord {
  const rows = (
    category
      ? db.prepare(`SELECT * FROM words WHERE word = ? AND category = ?`).all(word, category)
      : db.prepare(`SELECT * FROM words WHERE word = ?`).all(word)
  ) as WordRow[];

  if (rows.length === 0) {
    throw new HTTPError({ statusCode: 404, message: `No entry found for "${word}"` });
  }

  return mergeRows(rows);
}

/**
 * Prefix search — returns up to 50 results with word, category, and phonetic.
 */
export function searchWords(
  prefix: string,
  category?: string,
): { word: string; category: string; phonetic: string | null }[] {
  const escaped = prefix.toLowerCase().replace(/[%_]/g, "\\$&") + "%";

  type Row = { word: string; category: string; phonetic: string | null };

  // GROUP BY word+category so multi-POS words appear once; MAX(phonetic) picks
  // the non-null value when rows differ (SQLite MAX ignores NULLs).
  return (
    category
      ? db
          .prepare(
            `SELECT word, category, MAX(phonetic) AS phonetic FROM words
             WHERE lower(word) LIKE ? ESCAPE '\\' AND category = ?
             GROUP BY word, category
             ORDER BY word LIMIT 50`,
          )
          .all(escaped, category)
      : db
          .prepare(
            `SELECT word, category, MAX(phonetic) AS phonetic FROM words
             WHERE lower(word) LIKE ? ESCAPE '\\'
             GROUP BY word, category
             ORDER BY word LIMIT 50`,
          )
          .all(escaped)
  ) as Row[];
}
