import { defineStore } from "pinia";
import { ref } from "vue";

export const useFiltersStore = defineStore("filters", () => {
  const selectedEdition = ref<string | null>(null);

  function resetFilters() {
    selectedEdition.value = null;
  }

  return { selectedEdition, resetFilters };
});
