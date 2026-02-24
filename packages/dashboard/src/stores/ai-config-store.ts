import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useStorage } from "@vueuse/core";

export interface TargetLanguage {
  lang_code: string;
  lang: string;
}

const DEFAULT_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-7b-instruct:free",
];

export const DEFAULT_TARGET_LANGUAGES: TargetLanguage[] = [
  { lang_code: "vi", lang: "Vietnamese" },
  { lang_code: "fr", lang: "French" },
  { lang_code: "es", lang: "Spanish" },
  { lang_code: "de", lang: "German" },
  { lang_code: "ja", lang: "Japanese" },
  { lang_code: "zh", lang: "Chinese" },
  { lang_code: "ko", lang: "Korean" },
];

export const useAiConfigStore = defineStore("ai-config", () => {
  // Persisted in localStorage — safe to store (non-sensitive)
  const endpoint = useStorage("ai-config:endpoint", "https://openrouter.ai/api/v1");
  // List of models used in round-robin rotation to spread rate limits
  const models = useStorage<string[]>("ai-config:models", [...DEFAULT_MODELS]);
  // Auto-apply + save when all tasks complete without failures
  const autoImport = useStorage("ai-config:auto-import", false);
  // Target languages for translation generation (default: Vietnamese only)
  const targetLanguages = useStorage<TargetLanguage[]>("ai-config:target-languages", [
    { lang_code: "vi", lang: "Vietnamese" },
  ]);

  // In-memory only — never written to localStorage
  const apiKey = ref("");

  const isConfigured = computed(() => apiKey.value.trim().length > 0);

  return { endpoint, models, autoImport, targetLanguages, apiKey, isConfigured };
});

export { DEFAULT_MODELS };
