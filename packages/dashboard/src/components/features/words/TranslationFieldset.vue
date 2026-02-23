<script setup lang="ts">
import { computed } from "vue";
import { X } from "lucide-vue-next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
</script>

<template>
  <div class="grid grid-cols-2 gap-3 rounded-md border p-3">
    <div class="space-y-1">
      <Label>Language</Label>
      <Input
        :model-value="item.lang"
        placeholder="English"
        @input="update('lang', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="space-y-1">
      <Label>Lang code</Label>
      <Input
        :model-value="item.lang_code"
        placeholder="en"
        @input="update('lang_code', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="space-y-1">
      <Label>Code</Label>
      <Input
        :model-value="item.code"
        placeholder="en"
        @input="update('code', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="space-y-1">
      <Label>Word</Label>
      <Input
        :model-value="item.word"
        placeholder="translation"
        @input="update('word', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="col-span-2 flex items-end gap-2">
      <div class="flex-1 space-y-1">
        <Label>Part of speech</Label>
        <Input
          :model-value="item.partOfSpeech"
          placeholder="noun"
          @input="update('partOfSpeech', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <Button type="button" variant="ghost" size="icon" class="shrink-0" @click="emit('remove')">
        <X class="size-4" />
      </Button>
    </div>
  </div>
</template>
