<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { Sparkles } from "lucide-vue-next";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useWordByIdQuery } from "@/queries/words";
import { useAiConfig } from "@/composables/useAiConfig";
import { useAiTasks } from "@/composables/useAiTasks";
import { useAiGenerate } from "@/composables/useAiGenerate";
import type { WordData } from "@/types/word";

const WordForm = defineAsyncComponent(() => import("@/components/features/words/WordForm.vue"));
const DeleteWordDialog = defineAsyncComponent(
  () => import("@/components/features/words/DeleteWordDialog.vue"),
);
const AiConfigSheet = defineAsyncComponent(
  () => import("@/components/features/words/AiConfigSheet.vue"),
);
const AiGeneratePanel = defineAsyncComponent(
  () => import("@/components/features/words/AiGeneratePanel.vue"),
);

const route = useRoute();
const id = computed(() => route.params.id as string);
const { data, status } = useWordByIdQuery(id);

// AI state
const showAiPanel = ref(false);
const showAiConfig = ref(false);
const wordFormRef = ref<InstanceType<typeof WordForm>>();
const aiConfig = useAiConfig();

// AI composables — initialized reactively once form is available
const aiTasks = ref<ReturnType<typeof useAiTasks> | null>(null);
const aiGenerate = ref<ReturnType<typeof useAiGenerate> | null>(null);

watch(wordFormRef, async (formComponent) => {
  if (!formComponent) return;
  await nextTick();
  const form = (formComponent as { form: WordData }).form;
  if (!form) return;
  const taskState = useAiTasks(form);
  aiTasks.value = taskState;
  aiGenerate.value = useAiGenerate(aiConfig, taskState.tasks, form);
});

function onGenerateAll() {
  aiGenerate.value?.generateAll();
}

function onApplyAll() {
  aiGenerate.value?.applyAll();
  aiTasks.value?.refreshTasks();
}

function onApply(taskId: string) {
  aiGenerate.value?.applyResult(taskId);
  aiTasks.value?.refreshTasks();
}

function onRetry(taskId: string) {
  aiGenerate.value?.retryTask(taskId);
}
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
        <div class="flex items-center gap-2">
          <Button variant="outline" size="sm" @click="showAiPanel = !showAiPanel">
            <Sparkles class="size-4 mr-1" />
            AI Generate
          </Button>
          <DeleteWordDialog :id="id" :word="data.word" />
        </div>
      </div>

      <AiGeneratePanel
        v-if="showAiPanel && aiTasks && aiGenerate"
        :tasks="aiTasks.tasks"
        :is-running="aiGenerate.isRunning"
        :completed-count="aiGenerate.completedCount"
        :is-configured="!!aiConfig.isConfigured"
        @generate-all="onGenerateAll"
        @apply-all="onApplyAll"
        @apply="onApply"
        @retry="onRetry"
        @open-config="showAiConfig = true"
      />

      <AiConfigSheet
        v-if="showAiConfig"
        :config="aiConfig"
        :open="showAiConfig"
        @update:open="showAiConfig = $event"
      />

      <WordForm ref="wordFormRef" mode="edit" :word-id="id" :initial-data="data as WordData" />
    </template>

    <div v-else class="text-muted-foreground">Word not found.</div>
  </div>
</template>
