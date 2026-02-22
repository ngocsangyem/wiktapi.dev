<script setup lang="ts">
import { ref, watch } from "vue";
import { Search } from "lucide-vue-next";
import { Input } from "@/components/ui/input";

const props = defineProps<{ search: string }>();
const emit = defineEmits<{ "update:search": [value: string] }>();

const localValue = ref(props.search);
let debounceTimer: ReturnType<typeof setTimeout>;

watch(localValue, (val) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => emit("update:search", val), 300);
});

watch(
  () => props.search,
  (val) => {
    if (val !== localValue.value) localValue.value = val;
  },
);
</script>

<template>
  <div class="relative">
    <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    <Input v-model="localValue" placeholder="Search words..." class="pl-9" />
  </div>
</template>
