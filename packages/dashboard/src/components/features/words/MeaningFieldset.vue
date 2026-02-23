<script setup lang="ts">
import { computed } from "vue";
import { Plus, X } from "lucide-vue-next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { WordMeaning, WordDefinition } from "@/types/word";

const props = defineProps<{ modelValue: WordMeaning; index: number }>();
const emit = defineEmits<{
  "update:modelValue": [value: WordMeaning];
  remove: [];
}>();

const meaning = computed(() => props.modelValue);

function updateField<K extends keyof WordMeaning>(field: K, value: WordMeaning[K]) {
  emit("update:modelValue", { ...meaning.value, [field]: value });
}

function updateDefinition(i: number, field: keyof WordDefinition, value: string) {
  const defs = [...meaning.value.definitions];
  defs[i] = { ...defs[i]!, [field]: value };
  updateField("definitions", defs);
}

function addDefinition() {
  updateField("definitions", [...meaning.value.definitions, { definition: "" }]);
}

function removeDefinition(i: number) {
  updateField(
    "definitions",
    meaning.value.definitions.filter((_, idx) => idx !== i),
  );
}

function updateList(field: "synonyms" | "antonyms", csv: string) {
  updateField(
    field,
    csv
      ? csv
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  );
}
</script>

<template>
  <div class="rounded-md border p-4 space-y-4">
    <div class="flex items-center justify-between">
      <h4 class="font-medium text-sm">Meaning {{ index + 1 }}</h4>
      <Button type="button" variant="ghost" size="icon" @click="emit('remove')">
        <X class="size-4" />
      </Button>
    </div>

    <div class="space-y-1">
      <Label>Part of speech</Label>
      <Input
        :model-value="meaning.partOfSpeech"
        placeholder="noun, verb, adjective..."
        @input="updateField('partOfSpeech', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <Separator />

    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <Label>Definitions</Label>
        <Button type="button" variant="outline" size="sm" @click="addDefinition">
          <Plus class="size-3 mr-1" /> Add
        </Button>
      </div>
      <div v-for="(def, i) in meaning.definitions" :key="i" class="rounded-md border p-3 space-y-2">
        <div class="flex items-start gap-2">
          <Textarea
            :model-value="def.definition"
            placeholder="Definition..."
            class="flex-1 min-h-[60px]"
            @input="updateDefinition(i, 'definition', ($event.target as HTMLTextAreaElement).value)"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="shrink-0 mt-1"
            :disabled="meaning.definitions.length <= 1"
            @click="removeDefinition(i)"
          >
            <X class="size-3" />
          </Button>
        </div>
        <Input
          :model-value="def.example ?? ''"
          placeholder="Example sentence... (optional)"
          @input="updateDefinition(i, 'example', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <Separator />

    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-1">
        <Label>Synonyms <span class="text-muted-foreground">(comma-separated)</span></Label>
        <Input
          :model-value="(meaning.synonyms ?? []).join(', ')"
          placeholder="happy, joyful"
          @input="updateList('synonyms', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="space-y-1">
        <Label>Antonyms <span class="text-muted-foreground">(comma-separated)</span></Label>
        <Input
          :model-value="(meaning.antonyms ?? []).join(', ')"
          placeholder="sad, unhappy"
          @input="updateList('antonyms', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
  </div>
</template>
