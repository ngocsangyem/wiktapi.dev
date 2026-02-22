<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import WordForm from "@/components/features/words/WordForm.vue";
import DeleteWordDialog from "@/components/features/words/DeleteWordDialog.vue";
import { Skeleton } from "@/components/ui/skeleton";
import { useWordByIdQuery } from "@/queries/words";
import type { WordData } from "@/types/word";

const route = useRoute();
const id = computed(() => route.params.id as string);
const { data, status } = useWordByIdQuery(id);
</script>

<template>
  <div class="max-w-3xl">
    <template v-if="status === 'pending'">
      <Skeleton class="h-8 w-48 mb-6" />
      <Skeleton class="h-64 w-full" />
    </template>

    <template v-else-if="status === 'error'">
      <p class="text-destructive">
        Failed to load word. It may not exist or the server is unavailable.
      </p>
    </template>

    <template v-else-if="data">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">Edit: {{ data.word }}</h2>
        <DeleteWordDialog :id="id" :word="data.word" />
      </div>
      <WordForm mode="edit" :word-id="id" :initial-data="data as WordData" />
    </template>

    <div v-else class="text-muted-foreground">Word not found.</div>
  </div>
</template>
