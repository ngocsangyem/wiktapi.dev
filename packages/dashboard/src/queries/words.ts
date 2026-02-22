import { useQuery, useMutation, useQueryCache } from "@pinia/colada";
import { computed, type Ref } from "vue";
import {
  fetchWords,
  searchWords,
  fetchWord,
  createWord,
  updateWord,
  deleteWord,
  bulkDeleteWords,
} from "@/api/words";
import { useFiltersStore } from "@/stores/filters";
import type { WordData } from "@/types/word";

export function useWordsQuery(page: Ref<number>, limit: Ref<number>) {
  const filters = useFiltersStore();

  return useQuery({
    key: computed(() => [
      "words",
      page.value,
      limit.value,
      filters.selectedCategory ?? "",
      filters.selectedEdition ?? "",
    ]),
    query: ({ signal }: { signal?: AbortSignal }) =>
      fetchWords({
        page: page.value,
        limit: limit.value,
        category: filters.selectedCategory ?? undefined,
        edition: filters.selectedEdition ?? undefined,
        signal,
      }),
  });
}

export function useSearchQuery(q: Ref<string>, useRegex: Ref<boolean>) {
  const filters = useFiltersStore();
  return useQuery({
    key: () => {
      const search = q.value;
      const regex = useRegex.value;
      const category = filters.selectedCategory ?? "";
      return ["search", search, String(regex), category];
    },
    query: () => searchWords(q.value, filters.selectedCategory ?? undefined, useRegex.value),
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
    mutation: ({ word, data }: { word: string; data: WordData }) => updateWord(word, data),
    onSettled: ({ vars }: { vars: { word: string; data: WordData } }) => {
      void queryCache.invalidateQueries({ key: ["words"] });
      void queryCache.invalidateQueries({ key: ["word", vars.word] });
    },
  });
}

export function useDeleteWordMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: ({
      word,
      edition,
      category,
    }: {
      word: string;
      edition?: string;
      category?: string;
    }) => deleteWord(word, edition, category),
    onSettled: () => queryCache.invalidateQueries({ key: ["words"] }),
  });
}

export function useBulkDeleteWordsMutation() {
  const queryCache = useQueryCache();
  return useMutation({
    mutation: (words: string[]) => bulkDeleteWords(words),
    onSettled: () => {
      void queryCache.invalidateQueries({ key: ["words"] });
      // Don't invalidate search - it causes unnecessary refetch with empty q
    },
  });
}
