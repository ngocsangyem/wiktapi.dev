<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { RouterLink } from "vue-router";
import { Plus, Trash2 } from "lucide-vue-next";
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
import {
  useWordsQuery,
  useSearchQuery,
  useDeleteWordMutation,
  useBulkDeleteWordsMutation,
} from "@/queries/words";
import { useFiltersStore } from "@/stores/filters";
import type { WordListItem } from "@/types/word";

const page = ref(1);
const limit = ref(50);
const searchTerm = ref("");
const useRegex = ref(false);
const pendingDelete = ref<{ id: string; word: string } | "bulk" | null>(null);
const selectedWords = ref<string[]>([]);
const isDeleting = ref(false);
const isDialogOpen = ref(false);

const filters = useFiltersStore();
const { data: wordsData, status: wordsStatus } = useWordsQuery(page, limit);
const { data: searchData, status: searchStatus } = useSearchQuery(searchTerm, useRegex);
const deleteMutation = useDeleteWordMutation();
const bulkDeleteMutation = useBulkDeleteWordsMutation();

const isSearching = computed(() => searchTerm.value.length >= 2);

const tableWords = computed<WordListItem[]>(() => {
  if (isSearching.value) {
    return (searchData.value?.results ?? []).map((r) => ({
      id: r.id,
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
  // Capture the value before dialog closes (AlertDialogAction auto-closes)
  const toDelete = pendingDelete.value;

  if (!toDelete || isDeleting.value) return;
  isDeleting.value = true;

  try {
    if (toDelete === "bulk") {
      if (!selectedWords.value.length) return;
      await bulkDeleteMutation.mutateAsync(selectedWords.value);
      selectedWords.value = [];
    } else {
      await deleteMutation.mutateAsync({ id: toDelete.id });
    }
  } finally {
    pendingDelete.value = null;
    isDeleting.value = false;
  }
}

function handleOpenAlertDialog(data: { id: string; word: string } | "bulk") {
  if (typeof data === "string") {
    pendingDelete.value = data;
  } else {
    pendingDelete.value = { id: data.id, word: data.word };
  }
  isDialogOpen.value = true;
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-bold">Words</h2>
      <div class="flex items-center gap-2">
        <Button
          v-if="selectedWords.length > 0"
          variant="destructive"
          @click="handleOpenAlertDialog('bulk')"
        >
          <Trash2 class="size-4 mr-2" />
          Delete ({{ selectedWords.length }})
        </Button>
        <RouterLink to="/words/new">
          <Button>
            <Plus class="size-4 mr-2" />
            Add Word
          </Button>
        </RouterLink>
      </div>
    </div>

    <WordsSearch v-model:search="searchTerm" v-model:use-regex="useRegex" />

    <WordsTable
      :words="tableWords"
      :loading="isLoading"
      v-model:selected="selectedWords"
      @delete-requested="handleOpenAlertDialog($event)"
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
  <AlertDialog v-model:open="isDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {{
            pendingDelete === "bulk"
              ? `Delete ${selectedWords.length} words?`
              : pendingDelete
                ? `Delete "${pendingDelete.word}"?`
                : "Delete word?"
          }}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {{
            pendingDelete === "bulk"
              ? "This will permanently remove all selected words. This action cannot be undone."
              : "This will permanently remove all entries for this word. This action cannot be undone."
          }}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          :disabled="isDeleting"
          @click="handleDelete"
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
