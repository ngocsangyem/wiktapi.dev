<script setup lang="ts">
import { computed, ref } from "vue";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { WordTenses } from "@/types/word";

const props = defineProps<{
  modelValue?: WordTenses | null;
  enabled: boolean;
  hideToggle?: boolean;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: WordTenses | null];
  "update:enabled": [value: boolean];
}>();

const defaultTenses: WordTenses = { base: "", past: "", present: "", singular: "", plural: "" };
const tenses = computed(() => props.modelValue ?? defaultTenses);

// Computed getter/setter ensures v-model:checked reliably updates the parent prop
const isTensesChecked = ref(true);

function update(field: keyof WordTenses, value: string) {
  emit("update:modelValue", { ...tenses.value, [field]: value || undefined });
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="!hideToggle" class="flex items-center gap-2">
      <Switch id="tenses-toggle" v-model="isTensesChecked" />
      <label for="tenses-toggle" class="text-sm font-medium cursor-pointer">Include tenses</label>
    </div>
    <div v-if="isTensesChecked" class="grid grid-cols-3 gap-3">
      <div
        class="space-y-1"
        v-for="field in [
          'base',
          'past',
          'present',
          'future',
          'singular',
          'plural',
        ] as (keyof WordTenses)[]"
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
