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

export interface WordRow {
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
export function mergeRows(rows: WordRow[]): WordRecord {
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
 * Fetch a word by its ID.
 * Throws 404 if not found.
 */
export function fetchWordById(id: string, category?: string): WordRecord {
  const rows = (
    category
      ? db.prepare(`SELECT * FROM words WHERE id = ? AND category = ?`).all(id, category)
      : db.prepare(`SELECT * FROM words WHERE id = ?`).all(id)
  ) as WordRow[];

  if (rows.length === 0) {
    throw new HTTPError({ statusCode: 404, message: `No entry found for id "${id}"` });
  }

  return mergeRows(rows);
}

/**
 * Search words — returns up to 50 results with word, category, and phonetic.
 * Supports prefix search (default) or regex matching.
 */
export function searchWords(
  query: string,
  category?: string,
  useRegex?: boolean,
): { word: string; category: string; phonetic: string | null }[] {
  type Row = { id: string; word: string; category: string; phonetic: string | null };

  // For regex mode, fetch more results and filter in JavaScript
  if (useRegex) {
    // Validate regex before using
    try {
      new RegExp(query);
    } catch {
      // Invalid regex, return empty
      return [];
    }

    // Fetch more results for regex filtering
    const rows = (
      category
        ? db
            .prepare(
              `SELECT id, word, category, MAX(phonetic) AS phonetic FROM words
             WHERE category = ?
             GROUP BY id, word, category
             ORDER BY word LIMIT 200`,
            )
            .all(category)
        : db
            .prepare(
              `SELECT id, word, category, MAX(phonetic) AS phonetic FROM words
             GROUP BY id, word, category
             ORDER BY word LIMIT 200`,
            )
            .all()
    ) as Row[];

    const regex = new RegExp(query, "i");
    return rows.filter((row) => regex.test(row.word)).slice(0, 50);
  }

  // Prefix search (default)
  const escaped = query.toLowerCase().replace(/[%_]/g, "\\$&") + "%";

  // GROUP BY word+category so multi-POS words appear once; MAX(phonetic) picks
  // the non-null value when rows differ (SQLite MAX ignores NULLs).
  return (
    category
      ? db
          .prepare(
            `SELECT id, word, category, MAX(phonetic) AS phonetic FROM words
             WHERE lower(word) LIKE ? ESCAPE '\\' AND category = ?
             GROUP BY id, word, category
             ORDER BY word LIMIT 50`,
          )
          .all(escaped, category)
      : db
          .prepare(
            `SELECT id, word, category, MAX(phonetic) AS phonetic FROM words
             WHERE lower(word) LIKE ? ESCAPE '\\'
             GROUP BY id, word, category
             ORDER BY word LIMIT 50`,
          )
          .all(escaped)
  ) as Row[];
}
