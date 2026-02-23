export const WORDS_INSERT_SQL = `
  INSERT INTO words (id, word, edition, phonetic, phonetics, translations, tenses, createdAt)
  VALUES (@id, @word, @edition, @phonetic, @phonetics, @translations, @tenses, @createdAt)
`;

export const MEANINGS_INSERT_SQL = `
  INSERT INTO meanings (id, word_id, partOfSpeech, definitions, translations, synonyms, antonyms, sort_order)
  VALUES (@id, @word_id, @partOfSpeech, @definitions, @translations, @synonyms, @antonyms, @sort_order)
`;

export const WORDS_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS words (
    id           TEXT PRIMARY KEY,
    word         TEXT NOT NULL,
    edition      TEXT NOT NULL,   -- language code of the source Wiktionary edition (e.g. "en", "fr")
    phonetic     TEXT,
    phonetics    TEXT NOT NULL,
    translations TEXT NOT NULL,  -- JSON: TranslationItem[] (word-level aggregate)
    tenses       TEXT,           -- JSON: Tenses | null
    createdAt    TEXT NOT NULL,
    UNIQUE(word, edition)
  );
`;

export const MEANINGS_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS meanings (
    id           TEXT PRIMARY KEY,
    word_id      TEXT NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    partOfSpeech TEXT NOT NULL,
    definitions  TEXT NOT NULL,   -- JSON: Definition[]
    translations TEXT NOT NULL,   -- JSON: TranslationItem[] (per-meaning, for future use)
    synonyms     TEXT,            -- JSON: string[]
    antonyms     TEXT,            -- JSON: string[]
    sort_order   INTEGER NOT NULL DEFAULT 0
  );
`;

export const WORDS_INDEXES_DDL = `
  CREATE INDEX IF NOT EXISTS idx_word ON words (word);
`;

export const MEANINGS_INDEXES_DDL = `
  CREATE INDEX IF NOT EXISTS idx_meanings_word_id ON meanings (word_id);
`;
