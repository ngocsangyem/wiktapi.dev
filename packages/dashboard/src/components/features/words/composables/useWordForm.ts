import { reactive, ref, computed } from "vue";
import { useRouter } from "vue-router";
import { useCreateWordMutation, useUpdateWordMutation } from "@/queries/words";
import { wordDataSchema } from "@/schemas/word";
import type { WordData, WordMeaning } from "@/types/word";

export type WordFormProps = {
  initialData?: WordData;
  mode: "create" | "edit";
  wordId?: string;
};

const DEFAULT_MEANING: WordMeaning = {
  partOfSpeech: "",
  definitions: [{ text: "", translations: [] }],
  synonyms: [],
  antonyms: [],
};

export function useWordForm(props: WordFormProps) {
  const router = useRouter();
  const createMutation = useCreateWordMutation();
  const updateMutation = useUpdateWordMutation();

  const form = reactive<WordData>({
    word: props.initialData?.word ?? "",
    edition: props.initialData?.edition ?? "en",
    phonetic: props.initialData?.phonetic ?? null,
    phonetics: props.initialData?.phonetics ? [...props.initialData.phonetics] : [],
    meanings: props.initialData?.meanings?.length
      ? [...props.initialData.meanings]
      : [{ ...DEFAULT_MEANING }],
    translations: props.initialData?.translations ? [...props.initialData.translations] : [],
    tenses: props.initialData?.tenses ?? null,
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
    form.meanings.push({ ...DEFAULT_MEANING });
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
      } else if (props.wordId) {
        await updateMutation.mutateAsync({ id: props.wordId, data: result.data as WordData });
        router.push(`/words/${props.wordId}`);
      }
    } catch (e) {
      submitError.value = e instanceof Error ? e.message : "An unexpected error occurred";
    }
  }

  return {
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
  };
}
