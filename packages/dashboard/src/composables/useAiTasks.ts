import { computed, ref } from "vue";
import type { WordData } from "@/types/word";

export type AiTaskType =
  | "generate-ipa"
  | "generate-phonetic-us"
  | "generate-phonetic-uk"
  | "generate-example"
  | "generate-synonyms"
  | "generate-antonyms";

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

export function detectMissingData(form: WordData): AiTask[] {
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
      if (!def.example) {
        tasks.push({
          id: `example-${mi}-${di}`,
          type: "generate-example",
          label: `Example for meaning ${mi + 1}, def ${di + 1}`,
          context: { word, partOfSpeech, definition: def.definition },
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

  return tasks;
}

export function useAiTasks(form: WordData) {
  const tasks = ref<AiTask[]>(detectMissingData(form));
  const taskCount = computed(() => tasks.value.length);

  function refreshTasks() {
    // Preserve status/result for existing tasks by ID
    const existing = new Map(tasks.value.map((t) => [t.id, t]));
    const fresh = detectMissingData(form);
    tasks.value = fresh.map((t) => existing.get(t.id) ?? t);
  }

  return { tasks, taskCount, refreshTasks };
}
