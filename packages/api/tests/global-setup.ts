import Database from "better-sqlite3";
import { mkdirSync, rmSync } from "node:fs";
import {
  WORDS_TABLE_DDL,
  MEANINGS_TABLE_DDL,
  WORDS_INDEXES_DDL,
  MEANINGS_INDEXES_DDL,
  WORDS_INSERT_SQL,
  MEANINGS_INSERT_SQL,
} from "../utils/schema.ts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
export const TEST_DB_PATH = resolve(dir, "../data/test.db");

const SAMPLE_WORD_ROWS = [
  {
    id: "test-chat",
    word: "chat",
    edition: "en",
    phonetic: "/tʃæt/",
    phonetics: JSON.stringify([
      { text: "/tʃæt/", type: "us", audioUrl: null },
      { text: "/tʃæt/", type: "uk", audioUrl: null },
    ]),
    translations: JSON.stringify([]),
    tenses: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "test-run",
    word: "run",
    edition: "en",
    phonetic: "/ɹʌn/",
    phonetics: JSON.stringify([
      { text: "/ɹʌn/", type: "us", audioUrl: null },
      { text: "/ɹʌn/", type: "uk", audioUrl: null },
    ]),
    translations: JSON.stringify([
      { partOfSpeech: "verb", lang_code: "fr", code: "fr", lang: "French", word: "courir" },
      { partOfSpeech: "verb", lang_code: "vi", code: "vi", lang: "Vietnamese", word: "chạy" },
    ]),
    tenses: JSON.stringify({
      base_form: "run",
      past_simple: "ran",
      past_participle: "run",
      present_simple: { singular: "runs", plural: "run" },
      present_participle: "running",
      future: null,
    }),
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "test-tech",
    word: "technology",
    edition: "en",
    phonetic: "/tɛkˈnɒlədʒi/",
    phonetics: JSON.stringify([
      { text: "/tɛkˈnɒlədʒi/", type: "uk", audioUrl: null },
      { text: "/tɛkˈnɑːlədʒi/", type: "us", audioUrl: null },
    ]),
    translations: JSON.stringify([]),
    tenses: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

const SAMPLE_MEANING_ROWS = [
  {
    id: "meaning-1",
    word_id: "test-chat",
    partOfSpeech: "noun",
    definitions: JSON.stringify([
      { text: "an informal conversation", translations: [] },
      { text: "a small songbird of the Old World", translations: [] },
    ]),
    synonyms: JSON.stringify(["talk", "conversation"]),
    antonyms: null,
    sort_order: 0,
  },
  {
    id: "meaning-2",
    word_id: "test-chat",
    partOfSpeech: "verb",
    definitions: JSON.stringify([
      {
        text: "to converse casually",
        example: { text: "They chat online.", translations: [] },
        translations: [],
      },
    ]),
    synonyms: null,
    antonyms: null,
    sort_order: 1,
  },
  {
    id: "meaning-3",
    word_id: "test-run",
    partOfSpeech: "noun",
    definitions: JSON.stringify([{ text: "an act of running", translations: [] }]),
    synonyms: JSON.stringify(["sprint", "dash"]),
    antonyms: null,
    sort_order: 0,
  },
  {
    id: "meaning-4",
    word_id: "test-run",
    partOfSpeech: "verb",
    definitions: JSON.stringify([
      {
        text: "to move quickly on foot",
        example: { text: "I run every day.", translations: [] },
        translations: [
          { partOfSpeech: "verb", lang_code: "fr", code: "fr", lang: "French", word: "courir" },
          { partOfSpeech: "verb", lang_code: "vi", code: "vi", lang: "Vietnamese", word: "chạy" },
        ],
      },
    ]),
    synonyms: null,
    antonyms: null,
    sort_order: 1,
  },
  {
    id: "meaning-5",
    word_id: "test-tech",
    partOfSpeech: "noun",
    definitions: JSON.stringify([
      { text: "the application of scientific knowledge for practical purposes", translations: [] },
    ]),
    synonyms: JSON.stringify(["tech", "innovation"]),
    antonyms: null,
    sort_order: 0,
  },
];

export function setup() {
  mkdirSync(resolve(dir, "../data"), { recursive: true });

  const db = new Database(TEST_DB_PATH);
  db.pragma("foreign_keys = ON");

  // Drop in FK-safe order to avoid stale tables from interrupted previous runs
  db.exec("DROP TABLE IF EXISTS meanings;");
  db.exec("DROP TABLE IF EXISTS words;");

  db.exec(WORDS_TABLE_DDL);
  db.exec(MEANINGS_TABLE_DDL);
  db.exec(WORDS_INDEXES_DDL);
  db.exec(MEANINGS_INDEXES_DDL);

  const insertWord = db.prepare(WORDS_INSERT_SQL);
  const insertMeaning = db.prepare(MEANINGS_INSERT_SQL);

  db.transaction(() => {
    for (const row of SAMPLE_WORD_ROWS) insertWord.run(row);
    for (const row of SAMPLE_MEANING_ROWS) insertMeaning.run(row);
  })();

  db.close();
}

export function teardown() {
  rmSync(TEST_DB_PATH, { force: true });
}
