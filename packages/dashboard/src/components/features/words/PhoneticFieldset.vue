<script setup lang="ts">
import { computed } from "vue";
import { X } from "lucide-vue-next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PhoneticItem } from "@/types/word";

const props = defineProps<{ modelValue: PhoneticItem; index: number }>();
const emit = defineEmits<{
  "update:modelValue": [value: PhoneticItem];
  remove: [];
}>();

const item = computed(() => props.modelValue);

function update(field: keyof PhoneticItem, value: string) {
  emit("update:modelValue", { ...item.value, [field]: value || null });
}
</script>

<template>
  <div class="grid grid-cols-3 gap-3 rounded-md border p-3">
    <div class="space-y-1">
      <Label>Type</Label>
      <Select :model-value="item.type" @update:model-value="(v) => update('type', v as string)">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="uk">UK</SelectItem>
          <SelectItem value="us">US</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div class="space-y-1">
      <Label>Text</Label>
      <Input
        :model-value="item.text"
        placeholder="/fəˈnɛtɪk/"
        @input="update('text', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="space-y-1">
      <Label>Audio URL <span class="text-muted-foreground">(optional)</span></Label>
      <div class="flex gap-1">
        <Input
          :model-value="item.audioUrl ?? ''"
          placeholder="https://..."
          @input="update('audioUrl', ($event.target as HTMLInputElement).value)"
        />
        <Button type="button" variant="ghost" size="icon" class="shrink-0" @click="emit('remove')">
          <X class="size-4" />
        </Button>
      </div>
    </div>
  </div>
</template>
