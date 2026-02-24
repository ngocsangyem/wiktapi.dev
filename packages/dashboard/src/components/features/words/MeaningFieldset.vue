<script setup lang="ts">
import { computed, ref } from "vue";
import { Plus, X, ChevronDown, ChevronUp } from "lucide-vue-next";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import TranslationFieldset from "@/components/features/words/TranslationFieldset.vue";
import type { WordMeaning, WordDefinition, WordTranslationItem } from "@/types/word";

const props = defineProps<{ modelValue: WordMeaning; index: number }>();
const emit = defineEmits<{
  "update:modelValue": [value: WordMeaning];
  remove: [];
}>();

const isOpen = ref(false);

const meaning = computed(() => props.modelValue);

function updateField<K extends keyof WordMeaning>(field: K, value: WordMeaning[K]) {
  emit("update:modelValue", { ...meaning.value, [field]: value });
}

function updateDefinitionField(i: number, field: string, value: unknown) {
  const defs = [...meaning.value.definitions];
  defs[i] = { ...defs[i]!, [field]: value };
  updateField("definitions", defs);
}

function addDefinition() {
  updateField("definitions", [...meaning.value.definitions, { text: "", translations: [] }]);
}

function removeDefinition(i: number) {
  updateField(
    "definitions",
    meaning.value.definitions.filter((_, idx) => idx !== i),
  );
}

function updateExampleText(defIndex: number, text: string) {
  const defs = [...meaning.value.definitions];
  const def = { ...defs[defIndex]! };
  if (text) {
    def.example = { text, translations: def.example?.translations ?? [] };
  } else {
    def.example = undefined;
  }
  defs[defIndex] = def;
  updateField("definitions", defs);
}

function addDefinitionTranslation(defIndex: number) {
  const defs = [...meaning.value.definitions];
  const def = { ...defs[defIndex]! };
  def.translations = [
    ...def.translations,
    { lang: "", lang_code: "", code: "", word: "", partOfSpeech: "" },
  ];
  defs[defIndex] = def;
  updateField("definitions", defs);
}

function removeDefinitionTranslation(defIndex: number, transIndex: number) {
  const defs = [...meaning.value.definitions];
  const def = { ...defs[defIndex]! };
  def.translations = def.translations.filter((_, idx) => idx !== transIndex);
  defs[defIndex] = def;
  updateField("definitions", defs);
}

function updateDefinitionTranslation(
  defIndex: number,
  transIndex: number,
  value: WordTranslationItem,
) {
  const defs = [...meaning.value.definitions];
  const def = { ...defs[defIndex]! };
  def.translations = [...def.translations];
  def.translations[transIndex] = value;
  defs[defIndex] = def;
  updateField("definitions", defs);
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
  <div class="rounded-md border">
    <!-- Header row -->
    <div class="flex items-center gap-2 px-3 py-2">
      <button
        type="button"
        class="flex flex-1 items-center gap-2 text-left"
        @click="isOpen = !isOpen"
      >
        <component
          :is="isOpen ? ChevronUp : ChevronDown"
          class="size-4 shrink-0 text-muted-foreground"
        />
        <span class="text-sm font-medium">Meaning {{ index + 1 }}</span>
        <Badge v-if="meaning.partOfSpeech" variant="secondary" class="text-xs">
          {{ meaning.partOfSpeech }}
        </Badge>
        <span class="text-xs text-muted-foreground ml-auto">
          {{ meaning.definitions.length }} definition{{
            meaning.definitions.length !== 1 ? "s" : ""
          }}
        </span>
      </button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        class="shrink-0 size-7"
        @click="emit('remove')"
      >
        <X class="size-3" />
      </Button>
    </div>

    <!-- Body (collapsible) -->
    <div v-show="isOpen" class="border-t px-3 pb-3 pt-3 space-y-4">
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
        <div
          v-for="(def, i) in meaning.definitions"
          :key="i"
          class="rounded-md border p-3 space-y-3"
        >
          <!-- Definition text -->
          <div class="flex items-start gap-2">
            <Textarea
              :model-value="def.text"
              placeholder="Definition..."
              class="flex-1 min-h-[60px]"
              @input="
                updateDefinitionField(i, 'text', ($event.target as HTMLTextAreaElement).value)
              "
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

          <!-- Example sentence -->
          <Input
            :model-value="def.example?.text ?? ''"
            placeholder="Example sentence... (optional)"
            @input="updateExampleText(i, ($event.target as HTMLInputElement).value)"
          />

          <!-- Per-definition translations -->
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <Label class="text-xs text-muted-foreground">
                Definition translations
                <span v-if="def.translations.length" class="ml-1"
                  >({{ def.translations.length }})</span
                >
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                class="h-6 text-xs px-2"
                @click="addDefinitionTranslation(i)"
              >
                <Plus class="size-3 mr-1" /> Add
              </Button>
            </div>
            <TranslationFieldset
              v-for="(trans, ti) in def.translations"
              :key="ti"
              :model-value="trans"
              :index="ti"
              @update:model-value="updateDefinitionTranslation(i, ti, $event)"
              @remove="removeDefinitionTranslation(i, ti)"
            />
          </div>
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
  </div>
</template>
