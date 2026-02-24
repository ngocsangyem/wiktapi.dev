import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useStorage } from "@vueuse/core";

export const useAiConfigStore = defineStore("ai-config", () => {
  // Persisted in localStorage — safe to store (non-sensitive)
  const endpoint = useStorage("ai-config:endpoint", "https://openrouter.ai/api/v1");
  const model = useStorage("ai-config:model", "meta-llama/llama-3.3-70b-instruct:free");

  // In-memory only — never written to localStorage
  const apiKey = ref("");

  const isConfigured = computed(() => apiKey.value.trim().length > 0);

  return { endpoint, model, apiKey, isConfigured };
});
