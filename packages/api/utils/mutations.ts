import { HTTPError } from "nitro/h3";
import { dbWrite } from "./db";
import { WORDS_INSERT_SQL } from "./schema";
import { fetchWord, mergeRows } from "./queries";
import { WORD_CATEGORIES } from "./types";
import type { WordRow } from "./queries";
import type { WordData, WordCategory, WordRecord } from "./types";

function fetchWrittenWord(word: string, category: string): WordRecord {
  const rows = dbWrite
    .prepare(`SELECT * FROM words WHERE word = ? AND category = ?`)
    .all(word, category) as WordRow[];
  if (rows.length === 0) {
    throw new HTTPError({ statusCode: 500, message: "Failed to read word after write" });
  }
  return mergeRows(rows);
}

function validateWordBody(body: unknown): WordData {
  if (!body || typeof body !== "object") {
    throw new HTTPError({ statusCode: 400, message: "Request body must be a JSON object" });
  }

  const b = body as Record<string, unknown>;

  if (!b.word || typeof b.word !== "string" || b.word.trim() === "") {
    throw new HTTPError({ statusCode: 400, message: "Field 'word' must be a non-empty string" });
  }
  if (!b.edition || typeof b.edition !== "string" || b.edition.trim() === "") {
    throw new HTTPError({ statusCode: 400, message: "Field 'edition' must be a non-empty string" });
  }
  if (!b.category || !WORD_CATEGORIES.includes(b.category as WordCategory)) {
    throw new HTTPError({
      statusCode: 400,
      message: `Field 'category' must be one of: ${WORD_CATEGORIES.join(", ")}`,
    });
  }
  if (!Array.isArray(b.meanings) || b.meanings.length === 0) {
    throw new HTTPError({ statusCode: 400, message: "Field 'meanings' must be a non-empty array" });
  }
  if (!Array.isArray(b.phonetics)) {
    throw new HTTPError({ statusCode: 400, message: "Field 'phonetics' must be an array" });
  }
  if (!Array.isArray(b.translations)) {
    throw new HTTPError({ statusCode: 400, message: "Field 'translations' must be an array" });
  }

  return b as unknown as WordData;
}

function deleteRows(word: string, edition?: string, category?: string) {
  const conditions = ["word = ?"];
  const params: unknown[] = [word];

  if (edition) {
    conditions.push("edition = ?");
    params.push(edition);
  }
  if (category) {
    conditions.push("category = ?");
    params.push(category);
  }

  return dbWrite.prepare(`DELETE FROM words WHERE ${conditions.join(" AND ")}`).run(...params);
}

export function createWord(rawBody: unknown): WordRecord {
  const data = validateWordBody(rawBody);
  const createdAt = new Date().toISOString();
  const insertStmt = dbWrite.prepare(WORDS_INSERT_SQL);

  dbWrite.transaction(() => {
    for (const meaning of data.meanings) {
      insertStmt.run({
        id: crypto.randomUUID(),
        word: data.word,
        edition: data.edition,
        phonetic: data.phonetic ?? null,
        phonetics: JSON.stringify(data.phonetics),
        meanings: JSON.stringify([meaning]),
        category: data.category,
        translations: JSON.stringify(data.translations),
        tenses: data.tenses ? JSON.stringify(data.tenses) : null,
        createdAt,
      });
    }
  })();

  return fetchWrittenWord(data.word, data.category);
}

export function updateWord(
  word: string,
  rawBody: unknown,
  edition?: string,
  category?: string,
): WordRecord {
  const data = validateWordBody(rawBody);

  // Verify word exists before mutating; throws 404 if not found
  const existing = fetchWord(word, category);
  const insertStmt = dbWrite.prepare(WORDS_INSERT_SQL);

  dbWrite.transaction(() => {
    deleteRows(word, edition, category);
    for (const meaning of data.meanings) {
      insertStmt.run({
        id: crypto.randomUUID(),
        word: data.word,
        edition: data.edition,
        phonetic: data.phonetic ?? null,
        phonetics: JSON.stringify(data.phonetics),
        meanings: JSON.stringify([meaning]),
        category: data.category,
        translations: JSON.stringify(data.translations),
        tenses: data.tenses ? JSON.stringify(data.tenses) : null,
        createdAt: existing.createdAt, // preserve original creation timestamp
      });
    }
  })();

  return fetchWrittenWord(data.word, data.category);
}

export function deleteWord(word: string, edition?: string, category?: string): void {
  const result = deleteRows(word, edition, category);
  if (result.changes === 0) {
    throw new HTTPError({ statusCode: 404, message: `No entry found for "${word}"` });
  }
}

export function bulkDeleteWords(words: string[]): number {
  if (!Array.isArray(words) || words.length === 0) {
    throw new HTTPError({ statusCode: 400, message: "words must be a non-empty array" });
  }

  const placeholders = words.map(() => "?").join(", ");
  const result = dbWrite.prepare(`DELETE FROM words WHERE word IN (${placeholders})`).run(...words);
  return result.changes;
}
