import { useAiConfigStore } from "@/stores/ai-config-store";

/**
 * Returns the shared AI config state backed by a Pinia store.
 * - `endpoint` and `model` persist to localStorage across page navigations.
 * - `apiKey` is in-memory only and is cleared on page refresh (security).
 */
export function useAiConfig() {
  const store = useAiConfigStore();
  return store;
}

export type AiConfigState = ReturnType<typeof useAiConfig>;
