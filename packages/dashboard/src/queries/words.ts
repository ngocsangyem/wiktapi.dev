import { useQuery, useMutation, useQueryCache } from "@pinia/colada";
import { computed, type Ref } from "vue";
import {
  fetchWords,
  searchWords,
  fetchWord,
  fetchWordById,
  createWord,
  updateWordById,
  deleteWord,
  bulkDeleteWords,
} from "@/api/words";
import { useFiltersStore } from "@/stores/filters";
import type { WordData } from "@/types/word";

export function useWordsQuery(page: Ref<number>, limit: Ref<number>) {
  const filters = useFiltersStore();

  return useQuery({
    key: computed(() => ["words", page.value, limit.value, filters.selectedEdition ?? ""]),
    query: ({ signal }: { signal?: AbortSignal }) =>
      fetchWords({
        page: page.value,
        limit: limit.value,
        edition: filters.selectedEdition ?? undefined,
        signal,
      }),
  });
}

export function useSearchQuery(q: Ref<string>, useRegex: Ref<boolean>) {
  return useQuery({
    key: () => ["search", q.value, String(useRegex.value)],
    query: () => searchWords(q.value, useRegex.value),
    enabled: computed(() => q.value.length >= 2),
  });
}

export function useWordQuery(word: Ref<string>) {
  return useQuery({
    key: computed(() => ["word", word.value]),
    query: () => fetchWord(word.value),
    enabled: computed(() => !!word.value),
  });
}

export function useWordByIdQuery(id: Ref<string>) {
  return useQuery({
    key: computed(() => ["word", "by-id", id.value]),
    query: () => fetchWordById(id.value),
    enabled: computed(() => !!id.value),
  });
}

export function useCreateWordMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: (data: WordData) => createWord(data),
    onSettled: () => queryCache.invalidateQueries({ key: ["words"] }),
  });
}

export function useUpdateWordMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: ({ id, data }: { id: string; data: WordData }) => updateWordById(id, data),
    onSettled: ({ vars }: { vars: { id: string; data: WordData } }) => {
      void queryCache.invalidateQueries({ key: ["words"] });
      void queryCache.invalidateQueries({ key: ["word", "by-id", vars.id] });
    },
  });
}

export function useDeleteWordMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: ({ id, edition }: { id: string; edition?: string }) => deleteWord(id, edition),
    onSettled: () => queryCache.invalidateQueries({ key: ["words"] }),
  });
}

export function useBulkDeleteWordsMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: (words: string[]) => bulkDeleteWords(words),
    onSettled: () => {
      void queryCache.invalidateQueries({ key: ["words"] });
    },
  });
}
