<script setup lang="ts">
import { ref } from "vue";
import { X, Plus } from "lucide-vue-next";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DEFAULT_MODELS, DEFAULT_TARGET_LANGUAGES } from "@/stores/ai-config-store";
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
const newLangCode = ref("");
const newLangName = ref("");

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

function addTargetLanguage() {
  const code = newLangCode.value.trim().toLowerCase();
  const name = newLangName.value.trim();
  if (code && name && !props.config.targetLanguages.some((l) => l.lang_code === code)) {
    props.config.targetLanguages.push({ lang_code: code, lang: name });
  }
  newLangCode.value = "";
  newLangName.value = "";
}

function removeTargetLanguage(index: number) {
  props.config.targetLanguages.splice(index, 1);
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

        <!-- Target Languages -->
        <div class="space-y-1.5">
          <Label>
            Translation Languages
            <span class="text-muted-foreground text-xs">(languages to generate)</span>
          </Label>

          <div class="space-y-1">
            <div
              v-for="(lang, i) in props.config.targetLanguages"
              :key="lang.lang_code"
              class="flex items-center gap-2 rounded border border-border px-2 py-1 text-xs"
            >
              <span class="font-mono text-muted-foreground w-6 shrink-0">{{ lang.lang_code }}</span>
              <span class="flex-1 truncate">{{ lang.lang }}</span>
              <button
                type="button"
                class="text-muted-foreground hover:text-destructive"
                @click="removeTargetLanguage(i)"
              >
                <X class="size-3" />
              </button>
            </div>
            <p v-if="!props.config.targetLanguages.length" class="text-xs text-muted-foreground">
              No target languages. Add one below.
            </p>
          </div>

          <div class="flex gap-1 mt-2">
            <Input
              v-model="newLangCode"
              placeholder="vi"
              class="text-xs h-7 w-14 shrink-0"
              @keydown.enter.prevent="addTargetLanguage"
            />
            <Input
              v-model="newLangName"
              placeholder="Vietnamese"
              class="text-xs h-7"
              @keydown.enter.prevent="addTargetLanguage"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              class="h-7 px-2 shrink-0"
              :disabled="!newLangCode.trim() || !newLangName.trim()"
              @click="addTargetLanguage"
            >
              <Plus class="size-3" />
            </Button>
          </div>

          <p class="text-xs text-muted-foreground mt-2">Add preset:</p>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="lang in DEFAULT_TARGET_LANGUAGES"
              :key="lang.lang_code"
              type="button"
              :disabled="props.config.targetLanguages.some((l) => l.lang_code === lang.lang_code)"
              class="text-xs px-2 py-0.5 rounded border border-border hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
              @click="props.config.targetLanguages.push(lang)"
            >
              {{ lang.lang }}
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
