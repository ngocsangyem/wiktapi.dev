<script setup lang="ts">
import { computed } from "vue";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tenses } from "@/types/word";

const props = defineProps<{ modelValue: Tenses | undefined; enabled: boolean }>();
const emit = defineEmits<{
  "update:modelValue": [value: Tenses | undefined];
  "update:enabled": [value: boolean];
}>();

const defaultTenses: Tenses = { base: "", past: "", present: "", singular: "", plural: "" };
const tenses = computed(() => props.modelValue ?? defaultTenses);

function update(field: keyof Tenses, value: string) {
  emit("update:modelValue", { ...tenses.value, [field]: value || undefined });
}

function toggle(checked: boolean) {
  emit("update:enabled", checked);
  if (!checked) emit("update:modelValue", undefined);
  else emit("update:modelValue", defaultTenses);
}
</script>

<template>
  <div class="space-y-3">
    <label class="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        :checked="enabled"
        @change="toggle(($event.target as HTMLInputElement).checked)"
      />
      <span class="text-sm font-medium">Include tenses</span>
    </label>
    <div v-if="enabled" class="grid grid-cols-3 gap-3">
      <div
        class="space-y-1"
        v-for="field in [
          'base',
          'past',
          'present',
          'future',
          'singular',
          'plural',
        ] as (keyof Tenses)[]"
        :key="field"
      >
        <Label class="capitalize">
          {{ field }}
          <span v-if="field === 'future'" class="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          :model-value="tenses[field] ?? ''"
          :placeholder="field"
          @input="update(field, ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </div>
</template>
