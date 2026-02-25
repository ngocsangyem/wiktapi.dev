import { defineHandler, getRouterParam, createError } from "nitro/h3";
import { db, dbWrite } from "../../../../../utils/db";
import { chatCompletion } from "../../../../../utils/openrouter-client";
import { buildPrompt } from "../../../../../utils/bulk-ai-prompts";
import type { AiTaskType, AiTask } from "../../../../../utils/bulk-ai-prompts";
import type {
  WordRow,
  MeaningRow,
  PhoneticItem,
  TranslationItem,
  Definition,
  Tenses,
} from "../../../../../utils/types";

interface FailureRow {
  id: string;
  job_id: string;
  word_id: string;
  word: string;
  task_type: string;
  error_message: string;
  attempted_at: string;
  retry_count: number;
}

function reconstructWordData(wordRow: WordRow, meaningRows: MeaningRow[]) {
  return {
    phonetics: JSON.parse(wordRow.phonetics) as PhoneticItem[],
    translations: JSON.parse(wordRow.translations) as TranslationItem[],
    tenses: wordRow.tenses ? (JSON.parse(wordRow.tenses) as Tenses) : undefined,
    meanings: meaningRows.map((m) => ({
      partOfSpeech: m.partOfSpeech,
      definitions: JSON.parse(m.definitions) as Definition[],
      synonyms: m.synonyms ? (JSON.parse(m.synonyms) as string[]) : [],
      antonyms: m.antonyms ? (JSON.parse(m.antonyms) as string[]) : [],
    })),
  };
}

/** POST /v1/admin/ai-failures/:id/retry — inline retry of a single failed task. */
export default defineHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id) throw createError({ statusCode: 400, message: "Missing failure id" });

  const failure = db.prepare("SELECT * FROM ai_failures WHERE id = ?").get(id) as
    | FailureRow
    | undefined;

  if (!failure) throw createError({ statusCode: 404, message: "Failure not found" });

  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL ?? "google/gemini-2.0-flash-001";
  if (!apiKey) throw createError({ statusCode: 500, message: "OPENROUTER_API_KEY not configured" });

  const wordRow = db.prepare("SELECT * FROM words WHERE id = ?").get(failure.word_id) as
    | WordRow
    | undefined;

  if (!wordRow) {
    // Word was deleted — remove the failure record
    dbWrite.prepare("DELETE FROM ai_failures WHERE id = ?").run(id);
    return { message: "Word no longer exists — failure removed" };
  }

  const meaningRows = db
    .prepare("SELECT * FROM meanings WHERE word_id = ? ORDER BY sort_order")
    .all(wordRow.id) as MeaningRow[];

  const wordData = reconstructWordData(wordRow, meaningRows);

  // Rebuild task context from task_type (best-effort for inline retry)
  const taskType = failure.task_type as AiTaskType;
  const task: AiTask = {
    id: failure.id,
    type: taskType,
    context: { word: failure.word, partOfSpeech: wordData.meanings[0]?.partOfSpeech ?? "" },
  };

  const prompt = buildPrompt(task);
  const aiConfig = { endpoint: "https://openrouter.ai/api/v1", apiKey, model };

  try {
    const result = await chatCompletion(aiConfig, [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user },
    ]);

    // Apply result inline based on task type (simplified — word-level tasks only for retry)
    const r = result as Record<string, unknown>;
    dbWrite.transaction(() => {
      switch (taskType) {
        case "generate-ipa":
          if (r.phonetic)
            dbWrite
              .prepare("UPDATE words SET phonetic = ? WHERE id = ?")
              .run(r.phonetic, wordRow.id);
          break;
        case "generate-tenses":
          dbWrite
            .prepare("UPDATE words SET tenses = ? WHERE id = ?")
            .run(JSON.stringify(r), wordRow.id);
          break;
        case "generate-translation": {
          const translations = JSON.parse(wordRow.translations) as TranslationItem[];
          const newItem = r as unknown as TranslationItem;
          if (newItem.lang_code && !translations.some((t) => t.lang_code === newItem.lang_code)) {
            translations.push(newItem);
            dbWrite
              .prepare("UPDATE words SET translations = ? WHERE id = ?")
              .run(JSON.stringify(translations), wordRow.id);
          }
          break;
        }
        case "generate-synonyms":
        case "generate-antonyms": {
          const meaning = meaningRows[0];
          if (meaning) {
            const field = taskType === "generate-synonyms" ? "synonyms" : "antonyms";
            const values = (r[field] as string[]) ?? [];
            if (values.length > 0) {
              dbWrite
                .prepare(`UPDATE meanings SET ${field} = ? WHERE id = ?`)
                .run(JSON.stringify(values), meaning.id);
            }
          }
          break;
        }
      }
      // Remove failure on success
      dbWrite.prepare("DELETE FROM ai_failures WHERE id = ?").run(id);
    })();

    return { message: "Retry successful" };
  } catch (err) {
    // Increment retry count and update error
    dbWrite
      .prepare(
        "UPDATE ai_failures SET retry_count = retry_count + 1, error_message = ?, attempted_at = ? WHERE id = ?",
      )
      .run(err instanceof Error ? err.message : String(err), new Date().toISOString(), id);

    throw createError({
      statusCode: 500,
      message: `Retry failed: ${err instanceof Error ? err.message : String(err)}`,
    });
  }
});
