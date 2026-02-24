<script setup lang="ts">
import { ref } from "vue";
import { X, Plus } from "lucide-vue-next";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DEFAULT_MODELS } from "@/stores/ai-config-store";
import type { AiConfigState } from "@/composables/useAiConfig";

const props = defineProps<{
  // config is the Pinia store returned by useAiConfig(). Properties are accessed directly (no .value).
  config: AiConfigState;
  open: boolean;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
}>();

const customModelInput = ref("");

function addModel(model: string) {
  const trimmed = model.trim();
  if (trimmed && !props.config.models.includes(trimmed)) {
    props.config.models.push(trimmed);
  }
}

function addCustomModel() {
  addModel(customModelInput.value);
  customModelInput.value = "";
}

function removeModel(index: number) {
  if (props.config.models.length > 1) {
    props.config.models.splice(index, 1);
  }
}
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
          <p class="text-xs text-muted-foreground">Held in memory only. Cleared on page refresh.</p>
        </div>

        <div class="space-y-1.5">
          <Label
            >Models <span class="text-muted-foreground text-xs">(round-robin rotation)</span></Label
          >

          <!-- Active models list -->
          <div class="space-y-1">
            <div
              v-for="(m, i) in props.config.models"
              :key="m"
              class="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs"
            >
              <span class="flex-1 truncate">{{ m }}</span>
              <button
                type="button"
                :disabled="props.config.models.length <= 1"
                class="text-muted-foreground hover:text-destructive disabled:opacity-30"
                @click="removeModel(i)"
              >
                <X class="size-3" />
              </button>
            </div>
          </div>

          <!-- Custom model input -->
          <div class="flex gap-1 mt-2">
            <Input
              v-model="customModelInput"
              placeholder="org/model-name"
              class="text-xs h-7"
              @keydown.enter.prevent="addCustomModel"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              class="h-7 px-2 shrink-0"
              :disabled="
                !customModelInput.trim() || props.config.models.includes(customModelInput.trim())
              "
              @click="addCustomModel"
            >
              <Plus class="size-3" />
            </Button>
          </div>

          <!-- Add preset -->
          <p class="text-xs text-muted-foreground mt-2">Add preset:</p>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="m in DEFAULT_MODELS"
              :key="m"
              type="button"
              :disabled="props.config.models.includes(m)"
              class="text-xs px-2 py-0.5 rounded border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed truncate max-w-full"
              @click="addModel(m)"
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
