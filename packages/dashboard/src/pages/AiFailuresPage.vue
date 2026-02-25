<script setup lang="ts">
import { ref, computed } from "vue";
import { RouterLink } from "vue-router";
import { RefreshCw } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmpty,
} from "@/components/ui/table";
import { useAiFailuresQuery } from "@/queries/ai-failures";
import { retryFailure, bulkRetryFailures } from "@/api/bulk-generate-api";
import type { AiFailure } from "@/api/bulk-generate-api";

const TASK_TYPES = [
  "generate-ipa",
  "generate-phonetic-us",
  "generate-phonetic-uk",
  "generate-example",
  "generate-synonyms",
  "generate-antonyms",
  "generate-tenses",
  "generate-translation",
  "generate-definition-translation",
  "generate-example-translation",
];

const wordSearch = ref("");
const selectedTaskType = ref<string>("");
const page = ref(1);
const limit = 50;

const queryParams = computed(() => ({
  word: wordSearch.value || undefined,
  taskType: selectedTaskType.value || undefined,
  page: page.value,
  limit,
}));

const { data, status, refresh } = useAiFailuresQuery(queryParams);

const failures = computed(() => data.value?.failures ?? []);
const total = computed(() => data.value?.total ?? 0);
const totalPages = computed(() => Math.ceil(total.value / limit));

const retryingIds = ref(new Set<string>());
const isBulkRetrying = ref(false);
const expandedError = ref<string | null>(null);

async function handleRetry(failure: AiFailure): Promise<void> {
  retryingIds.value.add(failure.id);
  try {
    await retryFailure(failure.id);
    await refresh();
  } catch (err) {
    alert(`Retry failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    retryingIds.value.delete(failure.id);
  }
}

async function handleBulkRetry(): Promise<void> {
  const jobId = failures.value[0]?.job_id;
  if (!jobId) return;
  isBulkRetrying.value = true;
  try {
    const result = await bulkRetryFailures(jobId);
    alert(result.message);
  } catch (err) {
    alert(`Bulk retry failed: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    isBulkRetrying.value = false;
  }
}

function toggleError(id: string): void {
  expandedError.value = expandedError.value === id ? null : id;
}

function taskLabel(type: string): string {
  return type.replace("generate-", "").replace(/-/g, " ");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}
</script>

<template>
  <div class="container mx-auto p-6 space-y-6">
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold">AI Failures</h1>
        <p class="text-sm text-muted-foreground mt-1">
          {{ total.toLocaleString() }} failed task{{ total !== 1 ? "s" : "" }}
        </p>
      </div>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" @click="refresh">
          <RefreshCw class="size-4 mr-1" />
          Refresh
        </Button>
        <Button
          v-if="failures.length > 0"
          variant="outline"
          size="sm"
          :disabled="isBulkRetrying"
          @click="handleBulkRetry"
        >
          {{ isBulkRetrying ? "Creating retry job…" : "Retry All" }}
        </Button>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 flex-wrap">
      <Input v-model="wordSearch" placeholder="Search word…" class="w-48" @input="page = 1" />
      <Select
        :model-value="selectedTaskType || '_all_'"
        @update:model-value="
          (v) => {
            selectedTaskType = v === '_all_' ? '' : v;
            page = 1;
          }
        "
      >
        <SelectTrigger class="w-52">
          <SelectValue placeholder="All task types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_all_">All task types</SelectItem>
          <SelectItem v-for="t in TASK_TYPES" :key="t" :value="t">
            {{ taskLabel(t) }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- Table -->
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Word</TableHead>
          <TableHead>Task</TableHead>
          <TableHead>Error</TableHead>
          <TableHead>Attempted</TableHead>
          <TableHead class="text-center">Retries</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty v-if="status === 'pending'" :colspan="6">Loading…</TableEmpty>
        <TableEmpty v-else-if="failures.length === 0" :colspan="6">No failures found.</TableEmpty>
        <template v-else>
          <TableRow v-for="f in failures" :key="f.id">
            <TableCell>
              <RouterLink
                :to="`/words/${f.word_id}`"
                class="text-primary hover:underline font-medium"
              >
                {{ f.word }}
              </RouterLink>
            </TableCell>
            <TableCell>
              <Badge variant="outline" class="capitalize text-xs">
                {{ taskLabel(f.task_type) }}
              </Badge>
            </TableCell>
            <TableCell class="max-w-xs">
              <button
                class="text-left text-sm text-muted-foreground hover:text-foreground truncate block w-full"
                @click="toggleError(f.id)"
              >
                {{
                  expandedError === f.id
                    ? f.error_message
                    : f.error_message.slice(0, 60) + (f.error_message.length > 60 ? "…" : "")
                }}
              </button>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground whitespace-nowrap">
              {{ formatDate(f.attempted_at) }}
            </TableCell>
            <TableCell class="text-center text-sm">{{ f.retry_count }}</TableCell>
            <TableCell>
              <Button
                variant="outline"
                size="sm"
                :disabled="retryingIds.has(f.id)"
                @click="handleRetry(f)"
              >
                {{ retryingIds.has(f.id) ? "…" : "Retry" }}
              </Button>
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex items-center justify-between">
      <p class="text-sm text-muted-foreground">
        Page {{ page }} of {{ totalPages }} ({{ total.toLocaleString() }} total)
      </p>
      <div class="flex gap-2">
        <Button variant="outline" size="sm" :disabled="page <= 1" @click="page--">
          Previous
        </Button>
        <Button variant="outline" size="sm" :disabled="page >= totalPages" @click="page++">
          Next
        </Button>
      </div>
    </div>
  </div>
</template>
