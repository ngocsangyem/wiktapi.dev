export const WORDS_INSERT_SQL = `
  INSERT INTO words (id, word, phonetic, phonetics, meanings, category, translate, tenses, createdAt)
  VALUES (@id, @word, @phonetic, @phonetics, @meanings, @category, @translate, @tenses, @createdAt)
`;

export const WORDS_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS words (
    id         TEXT PRIMARY KEY,
    word       TEXT NOT NULL,
    phonetic   TEXT,
    phonetics  TEXT NOT NULL,
    meanings   TEXT NOT NULL,
    category   TEXT NOT NULL,
    translate  TEXT,
    tenses     TEXT,
    createdAt  TEXT NOT NULL
  );
`;

export const WORDS_INDEXES_DDL = `
  CREATE INDEX IF NOT EXISTS idx_word          ON words (word);
  CREATE INDEX IF NOT EXISTS idx_category      ON words (category);
  CREATE INDEX IF NOT EXISTS idx_word_category ON words (word, category);
`;
