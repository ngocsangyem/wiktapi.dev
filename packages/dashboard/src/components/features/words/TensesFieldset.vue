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

const defaultTenses: WordTenses = {
  base_form: null,
  past_simple: null,
  past_participle: null,
  present_simple: { singular: null, plural: null },
  present_participle: null,
  future: null,
};
const tenses = computed(() => props.modelValue ?? defaultTenses);

const isTensesChecked = ref(true);

interface TenseField {
  key: string;
  label: string;
  getValue: (t: WordTenses) => string | null;
  optional?: boolean;
}

const fields: TenseField[] = [
  { key: "base_form", label: "Base Form", getValue: (t) => t.base_form },
  { key: "past_simple", label: "Past Simple", getValue: (t) => t.past_simple },
  { key: "past_participle", label: "Past Participle", getValue: (t) => t.past_participle },
  {
    key: "present_simple.singular",
    label: "Present Simple (singular)",
    getValue: (t) => t.present_simple.singular,
  },
  {
    key: "present_simple.plural",
    label: "Present Simple (plural)",
    getValue: (t) => t.present_simple.plural,
  },
  { key: "present_participle", label: "Present Participle", getValue: (t) => t.present_participle },
  { key: "future", label: "Future", getValue: (t) => t.future, optional: true },
];

function update(key: string, value: string) {
  const updated = { ...tenses.value, present_simple: { ...tenses.value.present_simple } };
  if (key === "present_simple.singular") {
    updated.present_simple.singular = value || null;
  } else if (key === "present_simple.plural") {
    updated.present_simple.plural = value || null;
  } else {
    (updated as Record<string, unknown>)[key] = value || null;
  }
  emit("update:modelValue", updated);
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="!hideToggle" class="flex items-center gap-2">
      <Switch id="tenses-toggle" v-model="isTensesChecked" />
      <label for="tenses-toggle" class="text-sm font-medium cursor-pointer">Include tenses</label>
    </div>
    <div v-if="isTensesChecked" class="grid grid-cols-3 gap-3">
      <div v-for="field in fields" :key="field.key" class="space-y-1">
        <Label>
          {{ field.label }}
          <span v-if="field.optional" class="text-muted-foreground">(optional)</span>
        </Label>
        <Input
          :model-value="field.getValue(tenses) ?? ''"
          :placeholder="field.label"
          @input="update(field.key, ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </div>
</template>
