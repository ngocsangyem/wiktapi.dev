<script setup lang="ts">
import { Loader2 } from "lucide-vue-next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AiTask } from "@/composables/useAiTasks";

defineProps<{ task: AiTask; isRunning?: boolean }>();
defineEmits<{ apply: []; retry: [] }>();

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  idle: "secondary",
  loading: "outline",
  success: "default",
  error: "destructive",
};
</script>

<template>
  <div class="flex items-center justify-between gap-2 py-1.5">
    <span class="text-sm flex-1 truncate">{{ task.label }}</span>

    <div class="flex items-center gap-2 shrink-0">
      <Badge :variant="STATUS_VARIANT[task.status]">
        <Loader2 v-if="task.status === 'loading'" class="size-3 animate-spin" />
        {{ task.status }}
      </Badge>

      <Button
        v-if="task.status === 'success'"
        type="button"
        size="sm"
        variant="outline"
        class="h-6 px-2 text-xs"
        @click="$emit('apply')"
      >
        Apply
      </Button>

      <Button
        v-if="task.status === 'error'"
        type="button"
        size="sm"
        variant="outline"
        class="h-6 px-2 text-xs"
        :disabled="isRunning"
        @click="$emit('retry')"
      >
        Retry
      </Button>
    </div>
  </div>
  <p v-if="task.status === 'error' && task.error" class="text-xs text-destructive mb-1 pl-0">
    {{ task.error }}
  </p>
</template>
