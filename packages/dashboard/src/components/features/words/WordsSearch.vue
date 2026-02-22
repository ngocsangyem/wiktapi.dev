<script setup lang="ts">
import { ref, watch } from "vue";
import { Search, Regex } from "lucide-vue-next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const props = defineProps<{ search: string; useRegex?: boolean }>();
const emit = defineEmits<{
  "update:search": [value: string];
  "update:useRegex": [value: boolean];
}>();

const localValue = ref(props.search);
const localRegex = ref(props.useRegex ?? false);
let debounceTimer: ReturnType<typeof setTimeout>;

watch(localValue, (val) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => emit("update:search", val), 300);
});

watch(localRegex, (val) => {
  emit("update:useRegex", val);
});

watch(
  () => props.search,
  (val) => {
    if (val !== localValue.value) localValue.value = val;
  },
);

watch(
  () => props.useRegex,
  (val) => {
    if (val !== localRegex.value) localRegex.value = val ?? false;
  },
);
</script>

<template>
  <div class="flex gap-2">
    <div class="relative flex-1">
      <Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input v-model="localValue" placeholder="Search words..." class="pl-9" />
    </div>
    <Button
      variant="outline"
      size="icon"
      :class="localRegex ? 'bg-accent' : ''"
      title="Regex mode"
      @click="localRegex = !localRegex"
    >
      <Regex class="size-4" />
    </Button>
  </div>
</template>
