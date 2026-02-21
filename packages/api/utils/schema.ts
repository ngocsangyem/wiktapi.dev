export const WORDS_INSERT_SQL = `
  INSERT INTO words (id, word, edition, phonetic, phonetics, meanings, category, translations, tenses, createdAt)
  VALUES (@id, @word, @edition, @phonetic, @phonetics, @meanings, @category, @translations, @tenses, @createdAt)
`;

export const WORDS_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS words (
    id           TEXT PRIMARY KEY,
    word         TEXT NOT NULL,
    edition      TEXT NOT NULL,   -- language code of the source Wiktionary edition (e.g. "en", "fr")
    phonetic     TEXT,
    phonetics    TEXT NOT NULL,
    meanings     TEXT NOT NULL,
    category     TEXT NOT NULL,
    translations TEXT NOT NULL,  -- JSON: TranslationItem[]
    tenses       TEXT,           -- JSON: Tenses | null
    createdAt    TEXT NOT NULL
  );
`;

export const WORDS_INDEXES_DDL = `
  CREATE INDEX IF NOT EXISTS idx_word          ON words (word);
  CREATE INDEX IF NOT EXISTS idx_category      ON words (category);
  CREATE INDEX IF NOT EXISTS idx_word_category ON words (word, category);
`;
