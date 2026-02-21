import Database from "better-sqlite3";
import { mkdirSync, rmSync } from "node:fs";
import { WORDS_TABLE_DDL, WORDS_INDEXES_DDL, WORDS_INSERT_SQL } from "../utils/schema.ts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
export const TEST_DB_PATH = resolve(dir, "../data/test.db");

const SAMPLE_WORDS = [
  {
    id: "test-1",
    word: "chat",
    edition: "en",
    phonetic: "/tʃæt/",
    phonetics: JSON.stringify([
      { text: "/tʃæt/", type: "us", audioUrl: null },
      { text: "/tʃæt/", type: "uk", audioUrl: null },
    ]),
    meanings: JSON.stringify([
      {
        partOfSpeech: "noun",
        definitions: [
          { definition: "an informal conversation" },
          { definition: "a small songbird of the Old World" },
        ],
        translations: [],
        synonyms: ["talk", "conversation"],
        antonyms: [],
      },
    ]),
    category: "general",
    translations: JSON.stringify([]),
    tenses: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "test-2",
    word: "chat",
    edition: "en",
    phonetic: "/tʃæt/",
    phonetics: JSON.stringify([
      { text: "/tʃæt/", type: "us", audioUrl: null },
      { text: "/tʃæt/", type: "uk", audioUrl: null },
    ]),
    meanings: JSON.stringify([
      {
        partOfSpeech: "verb",
        definitions: [{ definition: "to converse casually", example: "They chat online." }],
        translations: [],
        synonyms: [],
        antonyms: [],
      },
    ]),
    category: "general",
    translations: JSON.stringify([]),
    tenses: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "test-3",
    word: "run",
    edition: "en",
    phonetic: "/ɹʌn/",
    phonetics: JSON.stringify([
      { text: "/ɹʌn/", type: "us", audioUrl: null },
      { text: "/ɹʌn/", type: "uk", audioUrl: null },
    ]),
    meanings: JSON.stringify([
      {
        partOfSpeech: "noun",
        definitions: [{ definition: "an act of running" }],
        translations: [],
        synonyms: ["sprint", "dash"],
        antonyms: [],
      },
    ]),
    category: "sports",
    translations: JSON.stringify([]),
    tenses: JSON.stringify({
      base: "run",
      past: "ran",
      present: "running",
      future: "",
      singular: "runs",
      plural: "run",
    }),
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "test-4",
    word: "run",
    edition: "en",
    phonetic: "/ɹʌn/",
    phonetics: JSON.stringify([
      { text: "/ɹʌn/", type: "us", audioUrl: null },
      { text: "/ɹʌn/", type: "uk", audioUrl: null },
    ]),
    meanings: JSON.stringify([
      {
        partOfSpeech: "verb",
        definitions: [{ definition: "to move quickly on foot", example: "I run every day." }],
        translations: [],
        synonyms: [],
        antonyms: [],
      },
    ]),
    category: "sports",
    translations: JSON.stringify([
      { partOfSpeech: "verb", lang_code: "fr", code: "fr", lang: "French", word: "courir" },
      { partOfSpeech: "verb", lang_code: "vi", code: "vi", lang: "Vietnamese", word: "chạy" },
    ]),
    tenses: JSON.stringify({
      base: "run",
      past: "ran",
      present: "running",
      future: "",
      singular: "runs",
      plural: "run",
    }),
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "test-5",
    word: "technology",
    edition: "en",
    phonetic: "/tɛkˈnɒlədʒi/",
    phonetics: JSON.stringify([
      { text: "/tɛkˈnɒlədʒi/", type: "uk", audioUrl: null },
      { text: "/tɛkˈnɑːlədʒi/", type: "us", audioUrl: null },
    ]),
    meanings: JSON.stringify([
      {
        partOfSpeech: "noun",
        definitions: [
          { definition: "the application of scientific knowledge for practical purposes" },
        ],
        translations: [],
        synonyms: ["tech", "innovation"],
        antonyms: [],
      },
    ]),
    category: "technology",
    translations: JSON.stringify([]),
    tenses: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

export function setup() {
  mkdirSync(resolve(dir, "../data"), { recursive: true });

  const db = new Database(TEST_DB_PATH);
  // Drop first so stale tables from interrupted previous runs don't cause silent fixture reuse
  db.exec("DROP TABLE IF EXISTS words;");
  db.exec(WORDS_TABLE_DDL);
  db.exec(WORDS_INDEXES_DDL);

  const insert = db.prepare(WORDS_INSERT_SQL);
  const insertMany = db.transaction((rows: typeof SAMPLE_WORDS) => {
    for (const row of rows) insert.run(row);
  });

  insertMany(SAMPLE_WORDS);
  db.close();
}

export function teardown() {
  rmSync(TEST_DB_PATH, { force: true });
}
