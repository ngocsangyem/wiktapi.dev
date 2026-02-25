import { computed, ref } from "vue";
import type { WordData } from "@/types/word";
import { useAiConfigStore } from "@/stores/ai-config-store";

export type AiTaskType =
  | "generate-ipa"
  | "generate-phonetic-us"
  | "generate-phonetic-uk"
  | "generate-example"
  | "generate-synonyms"
  | "generate-antonyms"
  | "generate-tenses"
  | "generate-translation";

export type AiTaskStatus = "idle" | "loading" | "success" | "error";

export interface AiTask {
  id: string;
  type: AiTaskType;
  label: string;
  context: Record<string, string>;
  status: AiTaskStatus;
  result?: unknown;
  error?: string;
}

export function detectMissingData(
  form: WordData,
  targetLanguages: { lang_code: string; lang: string }[] = [],
): AiTask[] {
  const tasks: AiTask[] = [];
  const word = form.word || "unknown";

  // IPA phonetic
  if (!form.phonetic) {
    tasks.push({
      id: "ipa",
      type: "generate-ipa",
      label: "IPA phonetic",
      context: { word },
      status: "idle",
    });
  }

  // US/UK phonetic entries
  const hasUs = form.phonetics.some((p) => p.type === "us");
  const hasUk = form.phonetics.some((p) => p.type === "uk");

  if (!hasUs) {
    tasks.push({
      id: "phonetic-us",
      type: "generate-phonetic-us",
      label: "US pronunciation",
      context: { word, type: "US" },
      status: "idle",
    });
  }

  if (!hasUk) {
    tasks.push({
      id: "phonetic-uk",
      type: "generate-phonetic-uk",
      label: "UK pronunciation",
      context: { word, type: "UK" },
      status: "idle",
    });
  }

  // Per-meaning tasks
  form.meanings.forEach((meaning, mi) => {
    const partOfSpeech = meaning.partOfSpeech || "";

    // Per-definition examples
    meaning.definitions.forEach((def, di) => {
      if (!def.example?.text) {
        tasks.push({
          id: `example-${mi}-${di}`,
          type: "generate-example",
          label: `Example for meaning ${mi + 1}, def ${di + 1}`,
          context: { word, partOfSpeech, definition: def.text },
          status: "idle",
        });
      }
    });

    // Synonyms
    if (!meaning.synonyms || meaning.synonyms.length === 0) {
      tasks.push({
        id: `synonyms-${mi}`,
        type: "generate-synonyms",
        label: `Synonyms for meaning ${mi + 1}`,
        context: { word, partOfSpeech },
        status: "idle",
      });
    }

    // Antonyms
    if (!meaning.antonyms || meaning.antonyms.length === 0) {
      tasks.push({
        id: `antonyms-${mi}`,
        type: "generate-antonyms",
        label: `Antonyms for meaning ${mi + 1}`,
        context: { word, partOfSpeech },
        status: "idle",
      });
    }
  });

  // Tenses — generate all forms when any required field is missing
  const tenses = form.tenses;
  const hasMissingTenses =
    !tenses ||
    !tenses.base_form ||
    !tenses.past_simple ||
    !tenses.past_participle ||
    !tenses.present_simple?.singular ||
    !tenses.present_simple?.plural ||
    !tenses.present_participle;
  if (hasMissingTenses) {
    tasks.push({
      id: "tenses",
      type: "generate-tenses",
      label: "Tenses & forms",
      context: { word, existing: tenses ? JSON.stringify(tenses) : "" },
      status: "idle",
    });
  }

  // Translation tasks — one per configured target language that is missing
  const firstPOS = form.meanings[0]?.partOfSpeech || "";
  for (const lang of targetLanguages) {
    const hasTranslation = form.translations.some((t) => t.lang_code === lang.lang_code);
    if (!hasTranslation) {
      tasks.push({
        id: `translation-${lang.lang_code}`,
        type: "generate-translation",
        label: `Translation (${lang.lang})`,
        context: {
          word,
          targetLang: lang.lang,
          targetLangCode: lang.lang_code,
          partOfSpeech: firstPOS,
        },
        status: "idle",
      });
    }
  }

  return tasks;
}

export function useAiTasks(form: WordData) {
  const config = useAiConfigStore();
  const tasks = ref<AiTask[]>(detectMissingData(form, config.targetLanguages));
  const taskCount = computed(() => tasks.value.length);

  function refreshTasks() {
    // Preserve status/result for existing tasks by ID
    const existing = new Map(tasks.value.map((t) => [t.id, t]));
    const fresh = detectMissingData(form, config.targetLanguages);
    tasks.value = fresh.map((t) => existing.get(t.id) ?? t);
  }

  return { tasks, taskCount, refreshTasks };
}
