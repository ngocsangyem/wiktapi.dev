<script setup lang="ts">
import { ref } from "vue";
import { Plus, Loader2 } from "lucide-vue-next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MeaningFieldset from "./MeaningFieldset.vue";
import PhoneticFieldset from "./PhoneticFieldset.vue";
import TranslationFieldset from "./TranslationFieldset.vue";
import TensesFieldset from "./TensesFieldset.vue";
import type { WordData } from "@/types/word";
import { useWordForm } from "./composables/useWordForm";

const props = defineProps<{ initialData?: WordData; mode: "create" | "edit"; wordId?: string }>();
const {
  form,
  tensesEnabled,
  validationErrors,
  submitError,
  isLoading,
  addMeaning,
  removeMeaning,
  addPhonetic,
  removePhonetic,
  addTranslation,
  removeTranslation,
  handleSubmit,
  router,
} = useWordForm(props);

const activeTab = ref("basic");

defineExpose({ form, handleSubmit });
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <Tabs v-model="activeTab">
      <TabsList class="w-full justify-start">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="meanings"> Meanings ({{ form.meanings.length }}) </TabsTrigger>
        <TabsTrigger value="translations">
          Translations ({{ form.translations.length }})
        </TabsTrigger>
        <TabsTrigger value="tenses">Tenses</TabsTrigger>
      </TabsList>

      <!-- Basic Info -->
      <TabsContent value="basic" class="space-y-4 mt-4">
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <Label>Word <span class="text-destructive">*</span></Label>
            <Input v-model="form.word" placeholder="word" :readonly="mode === 'edit'" />
          </div>
          <div class="space-y-1">
            <Label>Edition <span class="text-destructive">*</span></Label>
            <Input v-model="form.edition" placeholder="en" />
          </div>
          <div class="space-y-1">
            <Label>Phonetic <span class="text-muted-foreground">(optional)</span></Label>
            <Input
              :model-value="form.phonetic ?? ''"
              placeholder="/ˈwɜːd/"
              @update:model-value="(v) => (form.phonetic = (v as string) || null)"
            />
          </div>
        </div>

        <!-- Phonetics -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <Label class="text-sm font-medium">Phonetics</Label>
            <Button type="button" variant="outline" size="sm" @click="addPhonetic">
              <Plus class="size-3 mr-1" /> Add
            </Button>
          </div>
          <div class="space-y-2">
            <PhoneticFieldset
              v-for="(p, i) in form.phonetics"
              :key="i"
              :model-value="p"
              :index="i"
              @update:model-value="(v) => (form.phonetics[i] = v)"
              @remove="removePhonetic(i)"
            />
            <p v-if="!form.phonetics.length" class="text-sm text-muted-foreground">
              No phonetics added.
            </p>
          </div>
        </div>
      </TabsContent>

      <!-- Meanings -->
      <TabsContent value="meanings" class="mt-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium">
            Meanings <span class="text-destructive">*</span>
          </span>
          <Button type="button" variant="outline" size="sm" @click="addMeaning">
            <Plus class="size-3 mr-1" /> Add
          </Button>
        </div>
        <div class="space-y-3">
          <MeaningFieldset
            v-for="(m, i) in form.meanings"
            :key="i"
            :model-value="m"
            :index="i"
            @update:model-value="(v) => (form.meanings[i] = v)"
            @remove="removeMeaning(i)"
          />
          <p v-if="!form.meanings.length" class="text-sm text-muted-foreground">
            No meanings added.
          </p>
        </div>
      </TabsContent>

      <!-- Translations -->
      <TabsContent value="translations" class="mt-4">
        <div class="flex items-center justify-between mb-3">
          <span class="text-sm font-medium">Translations</span>
          <Button type="button" variant="outline" size="sm" @click="addTranslation">
            <Plus class="size-3 mr-1" /> Add
          </Button>
        </div>
        <div class="space-y-1">
          <TranslationFieldset
            v-for="(t, i) in form.translations"
            :key="i"
            :model-value="t"
            :index="i"
            @update:model-value="(v) => (form.translations[i] = v)"
            @remove="removeTranslation(i)"
          />
        </div>
        <p v-if="!form.translations.length" class="text-sm text-muted-foreground">
          No translations added.
        </p>
      </TabsContent>

      <!-- Tenses -->
      <TabsContent value="tenses" class="mt-4">
        <TensesFieldset
          :model-value="form.tenses"
          :enabled="tensesEnabled"
          @update:model-value="(v) => (form.tenses = v)"
          @update:enabled="(v) => (tensesEnabled = v)"
        />
      </TabsContent>
    </Tabs>

    <!-- Errors -->
    <ul
      v-if="validationErrors.length"
      class="rounded-md border border-destructive p-3 text-sm text-destructive space-y-1"
    >
      <li v-for="err in validationErrors" :key="err">{{ err }}</li>
    </ul>
    <p v-if="submitError" class="text-sm text-destructive">{{ submitError }}</p>

    <!-- Submit -->
    <div class="flex gap-3">
      <Button type="submit" :disabled="isLoading">
        <Loader2 v-if="isLoading" class="size-4 mr-2 animate-spin" />
        {{ mode === "create" ? "Create Word" : "Save Changes" }}
      </Button>
      <Button type="button" variant="outline" @click="router.back()">Cancel</Button>
    </div>
  </form>
</template>
