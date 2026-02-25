<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BulkGenerateForm from "@/components/features/bulk-generate/BulkGenerateForm.vue";
import BulkGenerateProgress from "@/components/features/bulk-generate/BulkGenerateProgress.vue";
import { useBulkGenerateStatusQuery } from "@/queries/bulk-generate";

const jobId = ref<string | null>(null);
const { data: job, refresh } = useBulkGenerateStatusQuery(jobId);

const isRunning = computed(() => job.value?.status === "running");

// Poll every 3s while job is running
let pollTimer: ReturnType<typeof setInterval> | null = null;

function startPolling(): void {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    void refresh();
  }, 3000);
}

function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

watch(
  isRunning,
  (running) => {
    if (running) startPolling();
    else stopPolling();
  },
  { immediate: true },
);

onMounted(() => {
  void refresh();
});
onUnmounted(() => stopPolling());

async function handleStart(config: {
  taskTypes: string[];
  model: string;
  rpm: number;
  concurrency: number;
  targetLangs: string;
}): Promise<void> {
  // Dashboard is monitor-only — show instructions to run CLI
  alert(
    `Start the CLI with:\n\npnpm --filter @wordictapi/api bulk-generate \\\n  --task-types ${config.taskTypes.join(",")} \\\n  --model ${config.model} \\\n  --rpm ${config.rpm} \\\n  --concurrency ${config.concurrency}${config.targetLangs ? ` \\\n  --target-langs ${config.targetLangs}` : ""}\n\nThe dashboard will auto-poll every 3s once the job is running.`,
  );
}
</script>

<template>
  <div class="container mx-auto p-6 space-y-6 max-w-3xl">
    <div>
      <h1 class="text-2xl font-bold">Bulk AI Generation</h1>
      <p class="text-sm text-muted-foreground mt-1">
        Generate missing AI content for dictionary words. Run the CLI script — this dashboard
        monitors progress.
      </p>
    </div>

    <!-- Live progress (when a job exists) -->
    <Card v-if="job">
      <CardHeader>
        <CardTitle>Current Job</CardTitle>
      </CardHeader>
      <CardContent>
        <BulkGenerateProgress :job="job" />
      </CardContent>
    </Card>

    <Card v-else-if="!isRunning">
      <CardHeader>
        <CardTitle>No Active Job</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground">
          No bulk generation job found. Use the form below to generate the CLI command.
        </p>
      </CardContent>
    </Card>

    <!-- Form card — always visible to generate CLI command -->
    <Card>
      <CardHeader>
        <CardTitle>Generate CLI Command</CardTitle>
      </CardHeader>
      <CardContent>
        <BulkGenerateForm @start="handleStart" />
      </CardContent>
    </Card>
  </div>
</template>
