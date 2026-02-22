<script setup lang="ts">
import { reactive, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { Plus, Loader2 } from "lucide-vue-next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MeaningFieldset from "./MeaningFieldset.vue";
import PhoneticFieldset from "./PhoneticFieldset.vue";
import TranslationFieldset from "./TranslationFieldset.vue";
import TensesFieldset from "./TensesFieldset.vue";
import { useCreateWordMutation, useUpdateWordMutation } from "@/queries/words";
import { wordDataSchema } from "@/schemas/word";
import { WORD_CATEGORIES } from "@/types/word";
import type { WordData, Meaning, PhoneticItem, TranslationItem } from "@/types/word";

const props = defineProps<{ initialData?: WordData; mode: "create" | "edit" }>();
const router = useRouter();
const createMutation = useCreateWordMutation();
const updateMutation = useUpdateWordMutation();

const defaultMeaning: Meaning = {
  partOfSpeech: "",
  definitions: [{ definition: "" }],
  translations: [],
  synonyms: [],
  antonyms: [],
};

const form = reactive<WordData>({
  word: props.initialData?.word ?? "",
  edition: props.initialData?.edition ?? "en",
  category: props.initialData?.category ?? "general",
  phonetic: props.initialData?.phonetic ?? null,
  phonetics: props.initialData?.phonetics ? [...props.initialData.phonetics] : [],
  meanings: props.initialData?.meanings?.length
    ? [...props.initialData.meanings]
    : [{ ...defaultMeaning }],
  translations: props.initialData?.translations ? [...props.initialData.translations] : [],
  tenses: props.initialData?.tenses,
});

const tensesEnabled = ref(!!props.initialData?.tenses);
const validationErrors = ref<string[]>([]);
const submitError = ref<string | null>(null);

const isLoading = computed(
  () =>
    createMutation.asyncStatus.value === "loading" ||
    updateMutation.asyncStatus.value === "loading",
);

function addMeaning() {
  form.meanings.push({ ...defaultMeaning });
}
function removeMeaning(i: number) {
  if (form.meanings.length > 1) form.meanings.splice(i, 1);
}
function addPhonetic() {
  form.phonetics.push({ type: "us", text: "" });
}
function removePhonetic(i: number) {
  form.phonetics.splice(i, 1);
}
function addTranslation() {
  form.translations.push({ lang: "", lang_code: "", code: "", word: "", partOfSpeech: "" });
}
function removeTranslation(i: number) {
  form.translations.splice(i, 1);
}

async function handleSubmit() {
  validationErrors.value = [];
  submitError.value = null;

  const result = wordDataSchema.safeParse(form);
  if (!result.success) {
    validationErrors.value = result.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
    return;
  }

  try {
    if (props.mode === "create") {
      await createMutation.mutateAsync(result.data as WordData);
      router.push("/words");
    } else {
      await updateMutation.mutateAsync({ word: form.word, data: result.data as WordData });
      router.push(`/words/${encodeURIComponent(form.word)}`);
    }
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : "An unexpected error occurred";
  }
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="handleSubmit">
    <!-- Basic Info -->
    <Card>
      <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
      <CardContent class="grid grid-cols-2 gap-4">
        <div class="space-y-1">
          <Label>Word <span class="text-destructive">*</span></Label>
          <Input v-model="form.word" placeholder="word" :readonly="mode === 'edit'" />
        </div>
        <div class="space-y-1">
          <Label>Edition <span class="text-destructive">*</span></Label>
          <Input v-model="form.edition" placeholder="en" />
        </div>
        <div class="space-y-1">
          <Label>Category <span class="text-destructive">*</span></Label>
          <Select v-model="form.category">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="cat in WORD_CATEGORIES" :key="cat" :value="cat">{{
                cat
              }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-1">
          <Label>Phonetic <span class="text-muted-foreground">(optional)</span></Label>
          <Input
            :model-value="form.phonetic ?? ''"
            placeholder="/ˈwɜːd/"
            @update:model-value="(v) => (form.phonetic = (v as string) || null)"
          />
        </div>
      </CardContent>
    </Card>

    <!-- Phonetics -->
    <Card>
      <CardHeader class="flex-row items-center justify-between">
        <CardTitle>Phonetics</CardTitle>
        <Button type="button" variant="outline" size="sm" @click="addPhonetic">
          <Plus class="size-3 mr-1" /> Add
        </Button>
      </CardHeader>
      <CardContent class="space-y-3">
        <PhoneticFieldset
          v-for="(p, i) in form.phonetics"
          :key="i"
          :model-value="p as PhoneticItem"
          :index="i"
          @update:model-value="(v) => (form.phonetics[i] = v)"
          @remove="removePhonetic(i)"
        />
        <p v-if="!form.phonetics.length" class="text-sm text-muted-foreground">
          No phonetics added.
        </p>
      </CardContent>
    </Card>

    <!-- Meanings -->
    <Card>
      <CardHeader class="flex-row items-center justify-between">
        <CardTitle>Meanings <span class="text-destructive">*</span></CardTitle>
        <Button type="button" variant="outline" size="sm" @click="addMeaning">
          <Plus class="size-3 mr-1" /> Add
        </Button>
      </CardHeader>
      <CardContent class="space-y-3">
        <MeaningFieldset
          v-for="(m, i) in form.meanings"
          :key="i"
          :model-value="m as Meaning"
          :index="i"
          @update:model-value="(v) => (form.meanings[i] = v)"
          @remove="removeMeaning(i)"
        />
      </CardContent>
    </Card>

    <!-- Translations -->
    <Card>
      <CardHeader class="flex-row items-center justify-between">
        <CardTitle>Translations</CardTitle>
        <Button type="button" variant="outline" size="sm" @click="addTranslation">
          <Plus class="size-3 mr-1" /> Add
        </Button>
      </CardHeader>
      <CardContent class="space-y-3">
        <TranslationFieldset
          v-for="(t, i) in form.translations"
          :key="i"
          :model-value="t as TranslationItem"
          :index="i"
          @update:model-value="(v) => (form.translations[i] = v)"
          @remove="removeTranslation(i)"
        />
        <p v-if="!form.translations.length" class="text-sm text-muted-foreground">
          No translations added.
        </p>
      </CardContent>
    </Card>

    <!-- Tenses -->
    <Card>
      <CardHeader><CardTitle>Tenses</CardTitle></CardHeader>
      <CardContent>
        <TensesFieldset
          :model-value="form.tenses"
          :enabled="tensesEnabled"
          @update:model-value="(v) => (form.tenses = v)"
          @update:enabled="(v) => (tensesEnabled = v)"
        />
      </CardContent>
    </Card>

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
