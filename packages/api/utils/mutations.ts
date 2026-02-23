import { HTTPError } from "nitro/h3";
import { dbWrite } from "./db";
import { WORDS_INSERT_SQL, MEANINGS_INSERT_SQL } from "./schema";
import { fetchWord, fetchWordById } from "./queries";
import type { MeaningRow, WordData, WordRecord, WordRow } from "./types";

function fetchWrittenWord(word: string): WordRecord {
  const wordRow = dbWrite.prepare("SELECT * FROM words WHERE word = ?").get(word) as
    | WordRow
    | undefined;
  if (!wordRow) {
    throw new HTTPError({ statusCode: 500, message: "Failed to read word after write" });
  }
  const meaningRows = dbWrite
    .prepare("SELECT * FROM meanings WHERE word_id = ? ORDER BY sort_order")
    .all(wordRow.id) as MeaningRow[];

  // Inline assembly to use dbWrite connection for read-after-write consistency
  return {
    id: wordRow.id,
    word: wordRow.word,
    edition: wordRow.edition,
    phonetic: wordRow.phonetic,
    phonetics: JSON.parse(wordRow.phonetics),
    meanings: meaningRows
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((m) => ({
        partOfSpeech: m.partOfSpeech,
        definitions: JSON.parse(m.definitions),
        translations: JSON.parse(m.translations),
        synonyms: m.synonyms ? JSON.parse(m.synonyms) : [],
        antonyms: m.antonyms ? JSON.parse(m.antonyms) : [],
      })),
    translations: JSON.parse(wordRow.translations),
    tenses: wordRow.tenses ? JSON.parse(wordRow.tenses) : undefined,
    createdAt: wordRow.createdAt,
  };
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

// Prepared statements used in transactions — callers must wrap in dbWrite.transaction()
const stmtInsertWord = () => dbWrite.prepare(WORDS_INSERT_SQL);
const stmtInsertMeaning = () => dbWrite.prepare(MEANINGS_INSERT_SQL);

function runInsertWord(wordId: string, data: WordData, createdAt: string): void {
  stmtInsertWord().run({
    id: wordId,
    word: data.word,
    edition: data.edition,
    phonetic: data.phonetic ?? null,
    phonetics: JSON.stringify(data.phonetics),
    translations: JSON.stringify(data.translations),
    tenses: data.tenses ? JSON.stringify(data.tenses) : null,
    createdAt,
  });

  const insertMeaning = stmtInsertMeaning();
  data.meanings.forEach((meaning, index) => {
    insertMeaning.run({
      id: crypto.randomUUID(),
      word_id: wordId,
      partOfSpeech: meaning.partOfSpeech,
      definitions: JSON.stringify(meaning.definitions),
      translations: JSON.stringify(meaning.translations ?? []),
      synonyms: meaning.synonyms?.length ? JSON.stringify(meaning.synonyms) : null,
      antonyms: meaning.antonyms?.length ? JSON.stringify(meaning.antonyms) : null,
      sort_order: index,
    });
  });
}

export function createWord(rawBody: unknown): WordRecord {
  const data = validateWordBody(rawBody);
  const wordId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  dbWrite.transaction(() => {
    runInsertWord(wordId, data, createdAt);
  })();

  return fetchWrittenWord(data.word);
}

export function updateWord(word: string, rawBody: unknown): WordRecord {
  const data = validateWordBody(rawBody);
  const existing = fetchWord(word);

  dbWrite.transaction(() => {
    // DELETE cascades to meanings via FK
    dbWrite.prepare("DELETE FROM words WHERE id = ?").run(existing.id);
    runInsertWord(existing.id, data, existing.createdAt);
  })();

  return fetchWrittenWord(data.word);
}

export function deleteWord(word: string): void {
  const result = dbWrite.prepare("DELETE FROM words WHERE word = ?").run(word);
  if (result.changes === 0) {
    throw new HTTPError({ statusCode: 404, message: `No entry found for "${word}"` });
  }
}

export function updateWordById(id: string, rawBody: unknown): WordRecord {
  const data = validateWordBody(rawBody);
  const existing = fetchWordById(id);

  dbWrite.transaction(() => {
    // DELETE cascades to meanings via FK; re-insert with same id to preserve URLs
    dbWrite.prepare("DELETE FROM words WHERE id = ?").run(id);
    runInsertWord(id, data, existing.createdAt);
  })();

  return fetchWrittenWord(data.word);
}

export function deleteWordById(id: string): void {
  const result = dbWrite.prepare("DELETE FROM words WHERE id = ?").run(id);
  if (result.changes === 0) {
    throw new HTTPError({ statusCode: 404, message: `No entry found for id "${id}"` });
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
