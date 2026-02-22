<script setup lang="ts">
import { computed } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const props = defineProps<{ page: number; limit: number; total: number }>();
const emit = defineEmits<{
  "update:page": [value: number];
  "update:limit": [value: number];
}>();

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.limit)));
const from = computed(() => Math.min((props.page - 1) * props.limit + 1, props.total));
const to = computed(() => Math.min(props.page * props.limit, props.total));
</script>

<template>
  <div class="flex items-center justify-between gap-4">
    <p class="text-sm text-muted-foreground">
      {{ total > 0 ? `${from}–${to} of ${total}` : "No results" }}
    </p>

    <div class="flex items-center gap-2">
      <span class="text-sm text-muted-foreground">Rows:</span>
      <Select
        :model-value="String(limit)"
        @update:model-value="(v) => emit('update:limit', Number(v))"
      >
        <SelectTrigger class="w-[70px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="25">25</SelectItem>
          <SelectItem value="50">50</SelectItem>
          <SelectItem value="100">100</SelectItem>
          <SelectItem value="200">200</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        :disabled="page <= 1"
        @click="emit('update:page', page - 1)"
      >
        <ChevronLeft class="size-4" />
      </Button>

      <span class="text-sm">{{ page }} / {{ totalPages }}</span>

      <Button
        variant="outline"
        size="icon"
        :disabled="page >= totalPages"
        @click="emit('update:page', page + 1)"
      >
        <ChevronRight class="size-4" />
      </Button>
    </div>
  </div>
</template>
