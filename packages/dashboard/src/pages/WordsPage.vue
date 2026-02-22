<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { RouterLink } from "vue-router";
import { Plus } from "lucide-vue-next";
import WordsTable from "@/components/features/words/WordsTable.vue";
import WordsSearch from "@/components/features/words/WordsSearch.vue";
import WordsPagination from "@/components/features/words/WordsPagination.vue";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useWordsQuery, useSearchQuery, useDeleteWordMutation } from "@/queries/words";
import { useFiltersStore } from "@/stores/filters";
import type { WordListItem } from "@/types/word";

const page = ref(1);
const limit = ref(50);
const searchTerm = ref("");
const pendingDelete = ref<string | null>(null);

const filters = useFiltersStore();
const { data: wordsData, status: wordsStatus } = useWordsQuery(page, limit);
const { data: searchData, status: searchStatus } = useSearchQuery(searchTerm);
const deleteMutation = useDeleteWordMutation();

const isSearching = computed(() => searchTerm.value.length >= 2);

const tableWords = computed<WordListItem[]>(() => {
  if (isSearching.value) {
    return (searchData.value?.results ?? []).map((r) => ({
      word: r.word,
      edition: "",
      category: r.category,
      phonetic: r.phonetic,
    }));
  }
  return wordsData.value?.words ?? [];
});

const isLoading = computed(() =>
  isSearching.value ? searchStatus.value === "pending" : wordsStatus.value === "pending",
);

// Reset page when filters or search change
watch([() => filters.selectedCategory, () => filters.selectedEdition, searchTerm], () => {
  page.value = 1;
});

async function handleDelete() {
  if (!pendingDelete.value) return;
  await deleteMutation.mutateAsync({ word: pendingDelete.value });
  pendingDelete.value = null;
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold">Words</h2>
      <RouterLink to="/words/new">
        <Button>
          <Plus class="size-4 mr-2" />
          Add Word
        </Button>
      </RouterLink>
    </div>

    <WordsSearch v-model:search="searchTerm" />

    <WordsTable
      :words="tableWords"
      :loading="isLoading"
      @delete="(word) => (pendingDelete = word)"
    />

    <WordsPagination
      v-if="!isSearching"
      v-model:page="page"
      v-model:limit="limit"
      :total="wordsData?.total ?? 0"
      @update:page="(v) => (page = v)"
      @update:limit="
        (v) => {
          limit = v;
          page = 1;
        }
      "
    />
  </div>

  <!-- Delete confirmation dialog -->
  <AlertDialog :open="!!pendingDelete" @update:open="(v) => !v && (pendingDelete = null)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete "{{ pendingDelete }}"?</AlertDialogTitle>
        <AlertDialogDescription>
          This will permanently remove all entries for this word. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          @click="handleDelete"
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
