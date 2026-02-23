<script setup lang="ts">
import { computed } from "vue";
import { X } from "lucide-vue-next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { WordTranslationItem } from "@/types/word";

const props = defineProps<{ modelValue: WordTranslationItem; index: number }>();
const emit = defineEmits<{
  "update:modelValue": [value: WordTranslationItem];
  remove: [];
}>();

const item = computed(() => props.modelValue);

function update(field: keyof WordTranslationItem, value: string) {
  emit("update:modelValue", { ...item.value, [field]: value });
}

// Keep `code` in sync with `lang_code` since they are redundant
function updateLangCode(value: string) {
  emit("update:modelValue", { ...item.value, lang_code: value, code: value });
}
</script>

<template>
  <div class="flex items-center gap-2">
    <Input
      :model-value="item.lang_code"
      placeholder="en"
      class="h-8 text-xs w-16 shrink-0"
      @input="updateLangCode(($event.target as HTMLInputElement).value)"
    />
    <Input
      :model-value="item.lang"
      placeholder="Language"
      class="h-8 text-xs w-28 shrink-0"
      @input="update('lang', ($event.target as HTMLInputElement).value)"
    />
    <Input
      :model-value="item.word"
      placeholder="Translation"
      class="h-8 text-xs flex-1"
      @input="update('word', ($event.target as HTMLInputElement).value)"
    />
    <Input
      :model-value="item.partOfSpeech"
      placeholder="POS"
      class="h-8 text-xs w-20 shrink-0"
      @input="update('partOfSpeech', ($event.target as HTMLInputElement).value)"
    />
    <Button
      type="button"
      variant="ghost"
      size="icon"
      class="size-7 shrink-0"
      @click="emit('remove')"
    >
      <X class="size-3" />
    </Button>
  </div>
</template>
