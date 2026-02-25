// App-level data quality constraints (SQLite cannot enforce JSON content):
//   words.phonetics      — only type "us" or "uk"; at most one entry per type
//   meanings.definitions — max 2 items per row; ranked by quality (example > translations > text length)
export const SCHEMA_VERSIONS_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS schema_versions (
    version    TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
`;

export const WORDS_INSERT_SQL = `
  INSERT INTO words (id, word, edition, phonetic, phonetics, translations, tenses, createdAt)
  VALUES (@id, @word, @edition, @phonetic, @phonetics, @translations, @tenses, @createdAt)
`;

export const MEANINGS_INSERT_SQL = `
  INSERT INTO meanings (id, word_id, partOfSpeech, definitions, synonyms, antonyms, sort_order)
  VALUES (@id, @word_id, @partOfSpeech, @definitions, @synonyms, @antonyms, @sort_order)
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
    definitions  TEXT NOT NULL,   -- JSON: Definition[] (each has text, example?, translations)
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

export const AI_GENERATION_JOBS_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS ai_generation_jobs (
    id              TEXT PRIMARY KEY,
    status          TEXT NOT NULL DEFAULT 'idle',
    task_types      TEXT NOT NULL,
    total_words     INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER NOT NULL DEFAULT 0,
    failed_count    INTEGER NOT NULL DEFAULT 0,
    last_processed_id TEXT,
    started_at      TEXT,
    updated_at      TEXT,
    config          TEXT NOT NULL
  );
`;

export const AI_FAILURES_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS ai_failures (
    id            TEXT PRIMARY KEY,
    job_id        TEXT NOT NULL REFERENCES ai_generation_jobs(id) ON DELETE CASCADE,
    word_id       TEXT NOT NULL,
    word          TEXT NOT NULL,
    task_type     TEXT NOT NULL,
    error_message TEXT NOT NULL,
    attempted_at  TEXT NOT NULL,
    retry_count   INTEGER NOT NULL DEFAULT 0
  );
`;

export const AI_FAILURES_INDEXES_DDL = `
  CREATE INDEX IF NOT EXISTS idx_ai_failures_job_id    ON ai_failures(job_id);
  CREATE INDEX IF NOT EXISTS idx_ai_failures_word_id   ON ai_failures(word_id);
  CREATE INDEX IF NOT EXISTS idx_ai_failures_task_type ON ai_failures(task_type);
  CREATE INDEX IF NOT EXISTS idx_ai_failures_retry_count ON ai_failures(retry_count);
`;
