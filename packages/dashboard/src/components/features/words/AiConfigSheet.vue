<script setup lang="ts">
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { AiConfigState } from "@/composables/useAiConfig";

const props = defineProps<{
  // config is the Pinia store returned by useAiConfig(). Pinia stores are reactive objects —
  // properties are accessed directly (config.endpoint, not config.endpoint.value).
  config: AiConfigState;
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.1-8b-instruct:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-7b-instruct:free",
];
</script>

<template>
  <Sheet :open="props.open" @update:open="emit('update:open', $event)">
    <SheetContent side="right">
      <SheetHeader>
        <SheetTitle>AI Config</SheetTitle>
      </SheetHeader>

      <div class="space-y-4 py-4">
        <div class="space-y-1.5">
          <Label>API Endpoint</Label>
          <Input v-model="props.config.endpoint" placeholder="https://openrouter.ai/api/v1" />
        </div>

        <div class="space-y-1.5">
          <Label>API Key</Label>
          <Input v-model="props.config.apiKey" type="password" placeholder="sk-or-..." />
          <p class="text-xs text-muted-foreground">Held in memory only. Cleared on navigation.</p>
        </div>

        <div class="space-y-1.5">
          <Label>Model</Label>
          <Input v-model="props.config.model" placeholder="model-id" />
          <div class="flex flex-wrap gap-1 mt-1">
            <button
              v-for="m in FREE_MODELS"
              :key="m"
              type="button"
              class="text-xs px-2 py-0.5 rounded border border-border hover:bg-accent cursor-pointer truncate max-w-full"
              @click="props.config.model = m"
            >
              {{ m }}
            </button>
          </div>
        </div>
      </div>

      <SheetFooter>
        <Button type="button" @click="emit('update:open', false)">Done</Button>
      </SheetFooter>
    </SheetContent>
  </Sheet>
</template>
