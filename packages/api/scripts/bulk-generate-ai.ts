/**
 * Bulk AI content generation script.
 *
 * Streams through all words in the database, detects missing fields, calls
 * OpenRouter for each task, and writes results back. Progress is checkpointed
 * every 100 words so a crashed run can resume from where it left off.
 *
 * Usage:
 *   pnpm --filter @wordictapi/api bulk-generate \
 *     --task-types generate-ipa,generate-tenses \
 *     --target-langs vi:Vietnamese,fr:French \
 *     --model google/gemini-2.0-flash-001 \
 *     --rpm 30 \
 *     --concurrency 3 \
 *     --db ./data/wiktionary.db
 */

import { Effect, Console } from "effect";
import Database from "better-sqlite3";
import { resolve } from "node:path";
import { chatCompletion, AiRateLimitError, AiParseError } from "../utils/openrouter-client.ts";
import { TokenBucketRateLimiter } from "../utils/rate-limiter.ts";
import { buildPrompt, ALL_TASK_TYPES } from "../utils/bulk-ai-prompts.ts";
import type { AiTask, AiTaskType } from "../utils/bulk-ai-prompts.ts";
import type {
  WordRow,
  MeaningRow,
  WordData,
  PhoneticItem,
  TranslationItem,
  Definition,
  Tenses,
} from "../utils/types.ts";

// ── CLI arg parsing ───────────────────────────────────────────────────────────

interface CliConfig {
  jobId: string | null;
  taskTypes: AiTaskType[];
  model: string;
  rpm: number;
  concurrency: number;
  dbPath: string;
  /** Parsed from "vi:Vietnamese,fr:French" */
  targetLangs: { lang_code: string; lang: string }[];
}

function parseArgs(): CliConfig {
  const args = process.argv.slice(2);

  function getArg(flag: string): string | null {
    const idx = args.indexOf(flag);
    return idx !== -1 ? (args[idx + 1] ?? null) : null;
  }

  const taskTypesRaw = getArg("--task-types");
  const targetLangsRaw = getArg("--target-langs");

  const taskTypes: AiTaskType[] = taskTypesRaw
    ? (taskTypesRaw.split(",").map((s) => s.trim()) as AiTaskType[])
    : ALL_TASK_TYPES;

  const targetLangs: { lang_code: string; lang: string }[] = targetLangsRaw
    ? targetLangsRaw.split(",").map((pair) => {
        const [code, ...rest] = pair.trim().split(":");
        return { lang_code: code ?? pair, lang: rest.join(":") || code || pair };
      })
    : [];

  return {
    jobId: getArg("--job-id"),
    taskTypes,
    model: getArg("--model") ?? "google/gemini-2.0-flash-001",
    rpm: parseInt(getArg("--rpm") ?? "30", 10) || 30,
    concurrency: parseInt(getArg("--concurrency") ?? "3", 10) || 3,
    dbPath: resolve(getArg("--db") ?? "./data/wiktionary.db"),
    targetLangs,
  };
}

// ── DB setup ──────────────────────────────────────────────────────────────────

function openDb(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  db.pragma("cache_size = -32000"); // 32MB
  return db;
}

// ── Job management ────────────────────────────────────────────────────────────

interface JobRow {
  id: string;
  status: string;
  task_types: string;
  total_words: number;
  processed_count: number;
  failed_count: number;
  last_processed_id: string | null;
  started_at: string | null;
  updated_at: string | null;
  config: string;
}

function createOrResumeJob(db: Database.Database, config: CliConfig): JobRow {
  const now = new Date().toISOString();

  if (config.jobId) {
    const existing = db
      .prepare("SELECT * FROM ai_generation_jobs WHERE id = ?")
      .get(config.jobId) as JobRow | undefined;

    if (existing) {
      console.log(
        `Resuming job ${config.jobId} from word ${existing.last_processed_id ?? "start"}`,
      );
      db.prepare(
        "UPDATE ai_generation_jobs SET status = 'running', updated_at = ? WHERE id = ?",
      ).run(now, config.jobId);
      return { ...existing, status: "running" };
    }
  }

  const jobId = config.jobId ?? crypto.randomUUID();
  const jobConfig = JSON.stringify({
    model: config.model,
    rpm_limit: config.rpm,
    concurrency: config.concurrency,
    target_langs: config.targetLangs,
  });

  db.prepare(`
    INSERT INTO ai_generation_jobs (id, status, task_types, total_words, processed_count, failed_count, last_processed_id, started_at, updated_at, config)
    VALUES (?, 'running', ?, 0, 0, 0, NULL, ?, ?, ?)
  `).run(jobId, JSON.stringify(config.taskTypes), now, now, jobConfig);

  console.log(`Created job ${jobId}`);
  return db.prepare("SELECT * FROM ai_generation_jobs WHERE id = ?").get(jobId) as JobRow;
}

// ── Word data reconstruction ──────────────────────────────────────────────────

function reconstructWordData(wordRow: WordRow, meaningRows: MeaningRow[]): WordData {
  return {
    word: wordRow.word,
    edition: wordRow.edition,
    phonetic: wordRow.phonetic,
    phonetics: JSON.parse(wordRow.phonetics) as PhoneticItem[],
    meanings: meaningRows.map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: JSON.parse(m.definitions) as Definition[],
      synonyms: m.synonyms ? (JSON.parse(m.synonyms) as string[]) : [],
      antonyms: m.antonyms ? (JSON.parse(m.antonyms) as string[]) : [],
    })),
    translations: JSON.parse(wordRow.translations) as TranslationItem[],
    tenses: wordRow.tenses ? (JSON.parse(wordRow.tenses) as Tenses) : undefined,
  };
}

// ── Missing data detection (no Vue deps) ─────────────────────────────────────

function detectMissingTasks(
  wordData: WordData,
  targetLangs: { lang_code: string; lang: string }[],
  taskTypeFilter: Set<AiTaskType>,
): AiTask[] {
  const tasks: AiTask[] = [];
  const word = wordData.word;

  function push(task: AiTask): void {
    if (taskTypeFilter.has(task.type)) tasks.push(task);
  }

  if (!wordData.phonetic) {
    push({ id: "ipa", type: "generate-ipa", context: { word } });
  }

  const hasUs = wordData.phonetics.some((p) => p.type === "us");
  const hasUk = wordData.phonetics.some((p) => p.type === "uk");
  if (!hasUs) push({ id: "phonetic-us", type: "generate-phonetic-us", context: { word } });
  if (!hasUk) push({ id: "phonetic-uk", type: "generate-phonetic-uk", context: { word } });

  wordData.meanings.forEach((meaning, mi) => {
    const partOfSpeech = meaning.partOfSpeech;

    meaning.definitions.forEach((def, di) => {
      if (!def.example?.text) {
        push({
          id: `example-${mi}-${di}`,
          type: "generate-example",
          context: { word, partOfSpeech, definition: def.text },
          mi,
          di,
        });
      }

      for (const lang of targetLangs) {
        const hasDefTr = def.translations.some((t) => t.lang_code === lang.lang_code);
        if (!hasDefTr) {
          push({
            id: `def-tr-${mi}-${di}-${lang.lang_code}`,
            type: "generate-definition-translation",
            context: {
              word,
              partOfSpeech,
              definition: def.text,
              targetLang: lang.lang,
              targetLangCode: lang.lang_code,
              mi: String(mi),
              di: String(di),
            },
            mi,
            di,
          });
        }
      }

      if (def.example?.text) {
        for (const lang of targetLangs) {
          const hasExTr = def.example.translations.some((t) => t.lang_code === lang.lang_code);
          if (!hasExTr) {
            push({
              id: `ex-tr-${mi}-${di}-${lang.lang_code}`,
              type: "generate-example-translation",
              context: {
                word,
                partOfSpeech,
                example: def.example.text,
                targetLang: lang.lang,
                targetLangCode: lang.lang_code,
                mi: String(mi),
                di: String(di),
              },
              mi,
              di,
            });
          }
        }
      }
    });

    if (!meaning.synonyms || meaning.synonyms.length === 0) {
      push({
        id: `synonyms-${mi}`,
        type: "generate-synonyms",
        context: { word, partOfSpeech },
        mi,
      });
    }

    if (!meaning.antonyms || meaning.antonyms.length === 0) {
      push({
        id: `antonyms-${mi}`,
        type: "generate-antonyms",
        context: { word, partOfSpeech },
        mi,
      });
    }
  });

  const t = wordData.tenses;
  const hasMissingTenses =
    !t ||
    !t.base_form ||
    !t.past_simple ||
    !t.past_participle ||
    !t.present_simple?.singular ||
    !t.present_simple?.plural ||
    !t.present_participle;
  if (hasMissingTenses) {
    push({
      id: "tenses",
      type: "generate-tenses",
      context: { word, existing: t ? JSON.stringify(t) : "" },
    });
  }

  const firstPOS = wordData.meanings[0]?.partOfSpeech ?? "";
  for (const lang of targetLangs) {
    const hasTr = wordData.translations.some((tr) => tr.lang_code === lang.lang_code);
    if (!hasTr) {
      push({
        id: `translation-${lang.lang_code}`,
        type: "generate-translation",
        context: {
          word,
          targetLang: lang.lang,
          targetLangCode: lang.lang_code,
          partOfSpeech: firstPOS,
        },
      });
    }
  }

  return tasks;
}

// ── Result application ────────────────────────────────────────────────────────

function applyResult(
  db: Database.Database,
  stmts: ReturnType<typeof prepareStatements>,
  wordRow: WordRow,
  meaningRows: MeaningRow[],
  task: AiTask,
  result: unknown,
): void {
  const r = result as Record<string, unknown>;

  switch (task.type) {
    case "generate-ipa": {
      const phonetic = r.phonetic as string | null;
      if (phonetic) stmts.updatePhonetic.run(phonetic, wordRow.id);
      break;
    }

    case "generate-phonetic-us":
    case "generate-phonetic-uk": {
      const phonetics = JSON.parse(wordRow.phonetics) as PhoneticItem[];
      const type = task.type === "generate-phonetic-us" ? "us" : "uk";
      const existing = phonetics.find((p) => p.type === type);
      if (!existing) {
        phonetics.push({ text: (r.text as string) ?? "", type, audioUrl: null });
        stmts.updatePhonetics.run(JSON.stringify(phonetics), wordRow.id);
      }
      break;
    }

    case "generate-example": {
      const mi = task.mi ?? 0;
      const di = task.di ?? 0;
      const meaningRow = meaningRows[mi];
      if (!meaningRow) break;
      const definitions = JSON.parse(meaningRow.definitions) as Definition[];
      if (definitions[di]) {
        definitions[di].example = { text: (r.example as string) ?? "", translations: [] };
        stmts.updateDefinitions.run(JSON.stringify(definitions), meaningRow.id);
      }
      break;
    }

    case "generate-synonyms": {
      const mi = task.mi ?? 0;
      const meaningRow = meaningRows[mi];
      if (!meaningRow) break;
      const synonyms = r.synonyms as string[] | undefined;
      if (Array.isArray(synonyms) && synonyms.length > 0) {
        stmts.updateSynonyms.run(JSON.stringify(synonyms), meaningRow.id);
      }
      break;
    }

    case "generate-antonyms": {
      const mi = task.mi ?? 0;
      const meaningRow = meaningRows[mi];
      if (!meaningRow) break;
      const antonyms = r.antonyms as string[] | undefined;
      if (Array.isArray(antonyms) && antonyms.length > 0) {
        stmts.updateAntonyms.run(JSON.stringify(antonyms), meaningRow.id);
      }
      break;
    }

    case "generate-tenses": {
      stmts.updateTenses.run(JSON.stringify(r), wordRow.id);
      break;
    }

    case "generate-translation": {
      const translations = JSON.parse(wordRow.translations) as TranslationItem[];
      const newItem = r as unknown as TranslationItem;
      if (newItem.lang_code && !translations.some((t) => t.lang_code === newItem.lang_code)) {
        translations.push(newItem);
        stmts.updateTranslations.run(JSON.stringify(translations), wordRow.id);
      }
      break;
    }

    case "generate-definition-translation": {
      const mi = task.mi ?? 0;
      const di = task.di ?? 0;
      const meaningRow = meaningRows[mi];
      if (!meaningRow) break;
      const definitions = JSON.parse(meaningRow.definitions) as Definition[];
      const def = definitions[di];
      if (def) {
        const newItem = r as unknown as TranslationItem;
        if (newItem.lang_code && !def.translations.some((t) => t.lang_code === newItem.lang_code)) {
          def.translations.push(newItem);
          stmts.updateDefinitions.run(JSON.stringify(definitions), meaningRow.id);
        }
      }
      break;
    }

    case "generate-example-translation": {
      const mi = task.mi ?? 0;
      const di = task.di ?? 0;
      const meaningRow = meaningRows[mi];
      if (!meaningRow) break;
      const definitions = JSON.parse(meaningRow.definitions) as Definition[];
      const def = definitions[di];
      if (def?.example) {
        const newItem = r as unknown as TranslationItem;
        if (
          newItem.lang_code &&
          !def.example.translations.some((t) => t.lang_code === newItem.lang_code)
        ) {
          def.example.translations.push(newItem);
          stmts.updateDefinitions.run(JSON.stringify(definitions), meaningRow.id);
        }
      }
      break;
    }
  }
}

// ── Prepared statements ───────────────────────────────────────────────────────

function prepareStatements(db: Database.Database) {
  return {
    updatePhonetic: db.prepare("UPDATE words SET phonetic = ? WHERE id = ?"),
    updatePhonetics: db.prepare("UPDATE words SET phonetics = ? WHERE id = ?"),
    updateTenses: db.prepare("UPDATE words SET tenses = ? WHERE id = ?"),
    updateTranslations: db.prepare("UPDATE words SET translations = ? WHERE id = ?"),
    updateDefinitions: db.prepare("UPDATE meanings SET definitions = ? WHERE id = ?"),
    updateSynonyms: db.prepare("UPDATE meanings SET synonyms = ? WHERE id = ?"),
    updateAntonyms: db.prepare("UPDATE meanings SET antonyms = ? WHERE id = ?"),
    selectMeanings: db.prepare("SELECT * FROM meanings WHERE word_id = ? ORDER BY sort_order"),
    insertFailure: db.prepare(`
      INSERT INTO ai_failures (id, job_id, word_id, word, task_type, error_message, attempted_at, retry_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `),
    checkpoint: db.prepare(`
      UPDATE ai_generation_jobs
      SET processed_count = ?, failed_count = ?, last_processed_id = ?, updated_at = ?
      WHERE id = ?
    `),
    checkAbort: db.prepare("SELECT status FROM ai_generation_jobs WHERE id = ?"),
    updateJobStatus: db.prepare(
      "UPDATE ai_generation_jobs SET status = ?, updated_at = ? WHERE id = ?",
    ),
    updateTotalWords: db.prepare("UPDATE ai_generation_jobs SET total_words = ? WHERE id = ?"),
    selectWordBatch: db.prepare("SELECT * FROM words WHERE id > ? ORDER BY id LIMIT ?"),
    selectFirstBatch: db.prepare("SELECT * FROM words ORDER BY id LIMIT ?"),
    countWords: db.prepare("SELECT COUNT(*) AS cnt FROM words"),
  };
}

// ── Main Effect pipeline ──────────────────────────────────────────────────────

const BATCH_SIZE = 100;
const CHECKPOINT_EVERY = 100; // words between checkpoint writes

const main: Effect.Effect<void, Error> = Effect.gen(function* () {
  const config = parseArgs();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    yield* Effect.fail(new Error("OPENROUTER_API_KEY env var is required"));
  }

  const aiConfig = {
    endpoint: "https://openrouter.ai/api/v1",
    apiKey: apiKey!,
    model: config.model,
  };
  const rateLimiter = new TokenBucketRateLimiter(config.rpm);
  const taskTypeFilter = new Set(config.taskTypes);

  yield* Console.log(`Starting bulk generation`);
  yield* Console.log(`  Model:       ${config.model}`);
  yield* Console.log(`  RPM limit:   ${config.rpm}`);
  yield* Console.log(`  Concurrency: ${config.concurrency}`);
  yield* Console.log(`  Task types:  ${config.taskTypes.join(", ")}`);
  yield* Console.log(
    `  Target langs: ${config.targetLangs.map((l) => `${l.lang_code}:${l.lang}`).join(", ") || "(none)"}`,
  );

  const db = openDb(config.dbPath);

  // Graceful shutdown on SIGINT/SIGTERM
  let abortFlag = false;
  const handleSignal = () => {
    console.log("\nShutdown signal received — finishing current word then exiting …");
    abortFlag = true;
  };
  process.on("SIGINT", handleSignal);
  process.on("SIGTERM", handleSignal);

  const job = createOrResumeJob(db, config);
  const stmts = prepareStatements(db);

  // Count total words
  const { cnt: totalWords } = stmts.countWords.get() as { cnt: number };
  stmts.updateTotalWords.run(totalWords, job.id);
  yield* Console.log(`  Total words: ${totalWords.toLocaleString()}`);

  // Abort polling every 10s
  const abortPollInterval = setInterval(() => {
    const row = stmts.checkAbort.get(job.id) as { status: string } | undefined;
    if (row?.status === "aborted") {
      console.log("Abort signal detected in DB — stopping after current word …");
      abortFlag = true;
    }
  }, 10_000);

  let processedCount = job.processed_count;
  let failedCount = job.failed_count;
  let lastProcessedId = job.last_processed_id ?? "";
  let wordsInBatch = 0;

  const semaphore = yield* Effect.makeSemaphore(config.concurrency);

  try {
    // Cursor-based streaming: fetch BATCH_SIZE words at a time
    while (!abortFlag) {
      const wordRows =
        lastProcessedId === ""
          ? (stmts.selectFirstBatch.all(BATCH_SIZE) as WordRow[])
          : (stmts.selectWordBatch.all(lastProcessedId, BATCH_SIZE) as WordRow[]);

      if (wordRows.length === 0) break;

      for (const wordRow of wordRows) {
        if (abortFlag) break;

        const meaningRows = stmts.selectMeanings.all(wordRow.id) as MeaningRow[];
        const wordData = reconstructWordData(wordRow, meaningRows);
        const tasks = detectMissingTasks(wordData, config.targetLangs, taskTypeFilter);

        if (tasks.length === 0) {
          processedCount++;
          lastProcessedId = wordRow.id;
          wordsInBatch++;
          continue;
        }

        // Process tasks with Effect.Semaphore for concurrency control
        let taskOk = 0;
        let taskFailed = 0;

        const taskEffects = tasks.map((task) =>
          semaphore.withPermits(1)(
            Effect.promise(async () => {
              await rateLimiter.acquire();
              try {
                const prompt = buildPrompt(task);
                const result = await chatCompletion(aiConfig, [
                  { role: "system", content: prompt.system },
                  { role: "user", content: prompt.user },
                ]);
                applyResult(db, stmts, wordRow, meaningRows, task, result);
                taskOk++;
              } catch (err) {
                taskFailed++;
                failedCount++;
                const errorMessage =
                  err instanceof AiRateLimitError || err instanceof AiParseError
                    ? err.message
                    : err instanceof Error
                      ? err.message
                      : String(err);
                stmts.insertFailure.run(
                  crypto.randomUUID(),
                  job.id,
                  wordRow.id,
                  wordRow.word,
                  task.type,
                  errorMessage,
                  new Date().toISOString(),
                );
              }
            }),
          ),
        );

        yield* Effect.all(taskEffects, { concurrency: config.concurrency });

        processedCount++;
        lastProcessedId = wordRow.id;
        wordsInBatch++;

        console.log(
          `[${processedCount.toLocaleString()}/${totalWords.toLocaleString()}] "${wordRow.word}" — ${tasks.length} tasks — ${taskOk} ok, ${taskFailed} failed`,
        );

        // Checkpoint every CHECKPOINT_EVERY words
        if (wordsInBatch >= CHECKPOINT_EVERY) {
          stmts.checkpoint.run(
            processedCount,
            failedCount,
            lastProcessedId,
            new Date().toISOString(),
            job.id,
          );
          wordsInBatch = 0;
        }
      }

      if (wordRows.length < BATCH_SIZE) break; // last page
    }
  } finally {
    clearInterval(abortPollInterval);
    process.off("SIGINT", handleSignal);
    process.off("SIGTERM", handleSignal);
  }

  // Final checkpoint
  stmts.checkpoint.run(
    processedCount,
    failedCount,
    lastProcessedId,
    new Date().toISOString(),
    job.id,
  );

  const finalStatus = abortFlag ? "aborted" : "completed";
  stmts.updateJobStatus.run(finalStatus, new Date().toISOString(), job.id);

  yield* Console.log(`\nJob ${job.id} ${finalStatus}`);
  yield* Console.log(`  Processed: ${processedCount.toLocaleString()}`);
  yield* Console.log(`  Failed:    ${failedCount.toLocaleString()}`);

  db.close();
});

Effect.runPromise(main).catch((err) => {
  console.error(err);
  process.exit(1);
});
