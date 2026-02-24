<script setup lang="ts">
import { computed } from "vue";
import { Settings, Sparkles } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import AiTaskItem from "./AiTaskItem.vue";
import type { AiTask } from "@/composables/useAiTasks";

const props = defineProps<{
  tasks: AiTask[];
  isRunning: boolean;
  completedCount: number;
  isConfigured: boolean;
}>();

const emit = defineEmits<{
  "generate-all": [];
  "apply-all": [];
  apply: [taskId: string];
  retry: [taskId: string];
  "open-config": [];
}>();

const hasSuccessful = computed(() => props.tasks.some((t) => t.status === "success"));
// Use pending count as denominator so "2/3" means 2 of the 3 tasks being run, not 2 of all tasks
const pendingCount = computed(
  () =>
    props.tasks.filter((t) => t.status === "idle" || t.status === "error" || t.status === "loading")
      .length,
);
</script>

<template>
  <div class="rounded-lg border bg-card p-4 space-y-3 mb-4">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5 font-medium text-sm">
        <Sparkles class="size-4" />
        AI Generate
      </div>
      <Button type="button" variant="ghost" size="icon" class="size-7" @click="emit('open-config')">
        <Settings class="size-4" />
      </Button>
    </div>

    <Separator />

    <!-- Not configured -->
    <div v-if="!isConfigured" class="text-sm text-muted-foreground space-y-2">
      <p>Configure your OpenRouter API key to start generating missing content.</p>
      <Button type="button" size="sm" variant="outline" @click="emit('open-config')">
        Configure API Key
      </Button>
    </div>

    <!-- No tasks -->
    <div v-else-if="tasks.length === 0" class="text-sm text-muted-foreground">
      No missing fields detected.
    </div>

    <!-- Task list -->
    <template v-else>
      <div class="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          :disabled="isRunning || !isConfigured"
          @click="emit('generate-all')"
        >
          <Sparkles class="size-3 mr-1" />
          Generate All
        </Button>
        <Button
          v-if="hasSuccessful"
          type="button"
          size="sm"
          variant="outline"
          @click="emit('apply-all')"
        >
          Apply All Successful
        </Button>
        <span v-if="isRunning" class="text-xs text-muted-foreground ml-auto">
          {{ completedCount }}/{{ pendingCount }} completed
        </span>
      </div>

      <div class="divide-y">
        <AiTaskItem
          v-for="task in tasks"
          :key="task.id"
          :task="task"
          :is-running="isRunning"
          @apply="emit('apply', task.id)"
          @retry="emit('retry', task.id)"
        />
      </div>
    </template>
  </div>
</template>
