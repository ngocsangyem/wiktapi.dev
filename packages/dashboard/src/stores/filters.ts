import { defineStore } from "pinia";
import { ref } from "vue";

export const useFiltersStore = defineStore("filters", () => {
  const selectedCategory = ref<string | null>(null);
  const selectedEdition = ref<string | null>(null);

  function resetFilters() {
    selectedCategory.value = null;
    selectedEdition.value = null;
  }

  return { selectedCategory, selectedEdition, resetFilters };
});
