import { ref } from "vue";
import type { Ref } from "vue";
import pLimit from "p-limit";
import { chatCompletion } from "@/api/openrouter-client";
import { buildPrompt } from "@/api/ai-prompt-templates";
import type { AiTask } from "@/composables/useAiTasks";
import type { AiConfigState } from "@/composables/useAiConfig";
import type { WordData } from "@/types/word";

export function useAiGenerate(
  config: AiConfigState,
  tasks: Ref<AiTask[]>,
  form: WordData | undefined,
  onSave?: () => void,
) {
  const isRunning = ref(false);
  const completedCount = ref(0);
  let abortController: AbortController | null = null;

  function getBaseConfig() {
    return { endpoint: config.endpoint, apiKey: config.apiKey };
  }

  /** Pick model for a task using round-robin across configured models */
  function pickModel(taskIndex: number): string {
    const models = config.models;
    if (!models || models.length === 0) return "meta-llama/llama-3.3-70b-instruct:free";
    return models[taskIndex % models.length];
  }

  async function runTask(task: AiTask, signal: AbortSignal, model: string) {
    task.status = "loading";
    const { system, user } = buildPrompt(task);
    try {
      const result = await chatCompletion(
        { ...getBaseConfig(), model },
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        signal,
      );
      task.result = result;
      task.status = "success";
      completedCount.value++;
    } catch (err) {
      // AbortError means cancelled — reset to idle without counting as completed
      if (err instanceof Error && err.name === "AbortError") {
        task.status = "idle";
        return;
      }
      task.status = "error";
      task.error = err instanceof Error ? err.message : String(err);
      completedCount.value++;
    }
  }

  async function generateAll() {
    if (isRunning.value) return;
    isRunning.value = true;
    completedCount.value = 0;

    abortController = new AbortController();
    const limit = pLimit(3);
    const signal = abortController.signal;

    const pendingTasks = tasks.value?.filter((t) => t.status === "idle" || t.status === "error");

    // Assign model per task via round-robin to spread load across models
    await Promise.allSettled(
      pendingTasks.map((t, i) => limit(() => runTask(t, signal, pickModel(i)))),
    );

    isRunning.value = false;

    // Auto-import: apply all results and trigger save if enabled and all tasks succeeded
    if (config.autoImport && tasks.value.every((t) => t.status === "success")) {
      applyAll();
      onSave?.();
    }
  }

  async function retryTask(taskId: string) {
    // Guard: don't overwrite the batch abortController while generateAll is running
    if (isRunning.value) return;
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task) return;
    task.status = "idle";
    task.error = undefined;
    task.result = undefined;
    abortController = new AbortController();
    const taskIndex = tasks.value.indexOf(task);
    await runTask(task, abortController.signal, pickModel(taskIndex));
  }

  function cancel() {
    abortController?.abort();
    isRunning.value = false;
  }

  function applyResult(taskId: string) {
    if (!form) return;
    const task = tasks.value.find((t) => t.id === taskId);
    if (!task || task.status !== "success" || !task.result) return;

    const result = task.result as Record<string, unknown>;
    const parts = task.id.split("-");

    switch (task.type) {
      case "generate-ipa":
        if (typeof result.phonetic === "string") form.phonetic = result.phonetic;
        break;

      case "generate-phonetic-us":
      case "generate-phonetic-uk": {
        // AI returns the full WordPhoneticItem: { type: "us"|"uk", text: "/.../" }
        const pt = result as { type?: string; text?: unknown };
        if (typeof pt.type === "string" && typeof pt.text === "string") {
          const idx = form.phonetics.findIndex((p) => p.type === pt.type);
          if (idx >= 0) {
            form.phonetics[idx].text = pt.text;
          } else {
            form.phonetics.push({ type: pt.type as "us" | "uk", text: pt.text });
          }
        }
        break;
      }

      case "generate-example": {
        const mi = Number(parts[1]);
        const di = Number(parts[2]);
        if (
          typeof result.example === "string" &&
          form.meanings[mi]?.definitions[di] !== undefined
        ) {
          form.meanings[mi].definitions[di].example = { text: result.example, translations: [] };
        }
        break;
      }

      case "generate-synonyms": {
        const mi = Number(parts[1]);
        if (Array.isArray(result.synonyms) && form.meanings[mi] !== undefined) {
          form.meanings[mi].synonyms = result.synonyms as string[];
        }
        break;
      }

      case "generate-antonyms": {
        const mi = Number(parts[1]);
        if (Array.isArray(result.antonyms) && form.meanings[mi] !== undefined) {
          form.meanings[mi].antonyms = result.antonyms as string[];
        }
        break;
      }

      case "generate-tenses": {
        // AI returns full WordTenses object; merge with existing to preserve any already-set fields
        const t = result as Record<string, unknown>;
        form.tenses = {
          base: typeof t.base === "string" ? t.base : (form.tenses?.base ?? ""),
          past: typeof t.past === "string" ? t.past : (form.tenses?.past ?? ""),
          present: typeof t.present === "string" ? t.present : (form.tenses?.present ?? ""),
          future: typeof t.future === "string" ? t.future : form.tenses?.future,
          singular: typeof t.singular === "string" ? t.singular : (form.tenses?.singular ?? ""),
          plural: typeof t.plural === "string" ? t.plural : (form.tenses?.plural ?? ""),
        };
        break;
      }

      case "generate-translation": {
        const t = result as {
          lang_code?: string;
          code?: string;
          lang?: string;
          word?: string;
          partOfSpeech?: string;
        };
        if (
          typeof t.lang_code === "string" &&
          typeof t.word === "string" &&
          typeof t.partOfSpeech === "string"
        ) {
          const item = {
            lang_code: t.lang_code,
            code: t.code ?? t.lang_code,
            lang: t.lang ?? t.lang_code,
            word: t.word,
            partOfSpeech: t.partOfSpeech,
          };
          const idx = form.translations.findIndex((tr) => tr.lang_code === t.lang_code);
          if (idx >= 0) {
            form.translations[idx] = item;
          } else {
            form.translations.push(item);
          }
        }
        break;
      }
    }
  }

  function applyAll() {
    tasks.value.filter((t) => t.status === "success").forEach((t) => applyResult(t.id));
  }

  return {
    isRunning,
    completedCount,
    generateAll,
    retryTask,
    applyResult,
    applyAll,
    cancel,
  };
}
