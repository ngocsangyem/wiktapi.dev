<script setup lang="ts">
import { computed } from "vue";
import { Badge } from "@/components/ui/badge";
import type { BulkGenerateJob } from "@/api/bulk-generate-api";

const props = defineProps<{ job: BulkGenerateJob }>();

const progressPercent = computed(() => {
  if (!props.job.totalWords) return 0;
  return Math.min(100, (props.job.processedCount / props.job.totalWords) * 100);
});

const elapsed = computed(() => {
  if (!props.job.startedAt) return null;
  return Date.now() - new Date(props.job.startedAt).getTime();
});

const elapsedFormatted = computed(() => {
  const ms = elapsed.value;
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
});

const etaFormatted = computed(() => {
  const ms = elapsed.value;
  if (!ms || !props.job.processedCount) return "—";
  const remaining = props.job.totalWords - props.job.processedCount;
  if (remaining <= 0) return "Done";
  const msPerWord = ms / props.job.processedCount;
  const etaMs = remaining * msPerWord;
  const s = Math.floor(etaMs / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `~${h}h ${m % 60}m`;
  if (m > 0) return `~${m}m ${s % 60}s`;
  return `~${s}s`;
});

const statusVariant = computed((): "default" | "secondary" | "destructive" | "outline" => {
  switch (props.job.status) {
    case "running":
      return "default";
    case "completed":
      return "secondary";
    case "aborted":
      return "outline";
    case "failed":
      return "destructive";
    default:
      return "outline";
  }
});
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <Badge :variant="statusVariant" class="capitalize">{{ job.status }}</Badge>
      <span class="text-sm text-muted-foreground">Job {{ job.id.slice(0, 8) }}…</span>
    </div>

    <!-- Progress bar -->
    <div class="space-y-1.5">
      <div class="flex justify-between text-sm">
        <span
          >{{ job.processedCount.toLocaleString() }} /
          {{ job.totalWords.toLocaleString() }} words</span
        >
        <span>{{ progressPercent.toFixed(1) }}%</span>
      </div>
      <div class="h-2 w-full rounded-full bg-secondary overflow-hidden">
        <div
          class="h-full rounded-full bg-primary transition-all duration-500"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
    </div>

    <!-- Stats grid -->
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <div class="rounded-lg border p-3 text-center">
        <p class="text-xs text-muted-foreground">Failed</p>
        <p class="text-lg font-semibold text-destructive">{{ job.failedCount.toLocaleString() }}</p>
      </div>
      <div class="rounded-lg border p-3 text-center">
        <p class="text-xs text-muted-foreground">Remaining</p>
        <p class="text-lg font-semibold">
          {{ Math.max(0, job.totalWords - job.processedCount).toLocaleString() }}
        </p>
      </div>
      <div class="rounded-lg border p-3 text-center">
        <p class="text-xs text-muted-foreground">Elapsed</p>
        <p class="text-lg font-semibold">{{ elapsedFormatted }}</p>
      </div>
      <div class="rounded-lg border p-3 text-center">
        <p class="text-xs text-muted-foreground">ETA</p>
        <p class="text-lg font-semibold">{{ etaFormatted }}</p>
      </div>
    </div>

    <!-- Config summary -->
    <div class="text-xs text-muted-foreground space-y-0.5">
      <p>Model: {{ job.config.model }}</p>
      <p>RPM: {{ job.config.rpm_limit }} · Concurrency: {{ job.config.concurrency }}</p>
      <p v-if="job.config.target_langs?.length">
        Languages: {{ job.config.target_langs.map((l) => l.lang).join(", ") }}
      </p>
    </div>
  </div>
</template>
