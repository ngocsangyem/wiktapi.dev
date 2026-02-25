import { HTTPError } from "nitro/h3";
import { db } from "./db.ts";
import { cleanPhonetics, trimDefinitions } from "./data-cleaning.ts";
import type {
  Definition,
  Meaning,
  MeaningRow,
  PhoneticItem,
  Tenses,
  TranslationItem,
  WordRecord,
  WordRow,
} from "./types.ts";

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

function assembleWordRecord(wordRow: WordRow, meaningRows: MeaningRow[]): WordRecord {
  return {
    id: wordRow.id,
    word: wordRow.word,
    edition: wordRow.edition,
    phonetic: wordRow.phonetic,
    phonetics: cleanPhonetics(safeParseJson<PhoneticItem[]>(wordRow.phonetics, "phonetics")),
    meanings: meaningRows
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({
        partOfSpeech: m.partOfSpeech,
        definitions: trimDefinitions(safeParseJson<Definition[]>(m.definitions, "definitions")),
        synonyms: m.synonyms ? safeParseJson<string[]>(m.synonyms, "synonyms") : [],
        antonyms: m.antonyms ? safeParseJson<string[]>(m.antonyms, "antonyms") : [],
      })) as Meaning[],
    translations: safeParseJson<TranslationItem[]>(wordRow.translations, "translations"),
    tenses: wordRow.tenses ? safeParseJson<Tenses>(wordRow.tenses, "tenses") : undefined,
    createdAt: wordRow.createdAt,
  };
}

/**
 * Fetch a word by its string value.
 * Throws 404 if not found.
 */
export function fetchWord(word: string): WordRecord {
  const wordRow = db.prepare("SELECT * FROM words WHERE word = ?").get(word) as WordRow | undefined;

  if (!wordRow) {
    throw new HTTPError({ statusCode: 404, message: `No entry found for "${word}"` });
  }

  const meaningRows = db
    .prepare("SELECT * FROM meanings WHERE word_id = ? ORDER BY sort_order")
    .all(wordRow.id) as MeaningRow[];

  return assembleWordRecord(wordRow, meaningRows);
}

/**
 * Fetch a word by its UUID.
 * Throws 404 if not found.
 */
export function fetchWordById(id: string): WordRecord {
  const wordRow = db.prepare("SELECT * FROM words WHERE id = ?").get(id) as WordRow | undefined;

  if (!wordRow) {
    throw new HTTPError({ statusCode: 404, message: `No entry found for id "${id}"` });
  }

  const meaningRows = db
    .prepare("SELECT * FROM meanings WHERE word_id = ? ORDER BY sort_order")
    .all(id) as MeaningRow[];

  return assembleWordRecord(wordRow, meaningRows);
}

/**
 * Search words — returns up to 50 results with word and phonetic.
 * Supports prefix search (default) or regex matching.
 */
export function searchWords(
  query: string,
  useRegex?: boolean,
): { id: string; word: string; phonetic: string | null }[] {
  type Row = { id: string; word: string; phonetic: string | null };

  if (useRegex) {
    try {
      new RegExp(query);
    } catch {
      return [];
    }

    const rows = db
      .prepare("SELECT id, word, phonetic FROM words ORDER BY word LIMIT 200")
      .all() as Row[];

    const regex = new RegExp(query, "i");
    return rows.filter((row) => regex.test(row.word)).slice(0, 50);
  }

  const escaped = query.toLowerCase().replace(/[%_]/g, "\\$&") + "%";

  return db
    .prepare(
      `SELECT id, word, phonetic FROM words
       WHERE lower(word) LIKE ? ESCAPE '\\'
       ORDER BY word LIMIT 50`,
    )
    .all(escaped) as Row[];
}
