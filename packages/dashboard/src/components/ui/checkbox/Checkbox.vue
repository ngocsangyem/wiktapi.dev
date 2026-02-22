<script setup lang="ts">
import { cn } from "@/utils";
import { Check, Minus } from "lucide-vue-next";
import { computed } from "vue";

defineOptions({
  inheritAttrs: false,
});

const props = defineProps<{
  checked?: boolean | "indeterminate";
  disabled?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  value?: string | number | boolean;
}>();

const model = defineModel<boolean | "indeterminate">({ default: false });

const isChecked = computed(() => model.value === true);
const isIndeterminate = computed(() => model.value === "indeterminate");

function handleClick() {
  if (props.disabled) return;

  if (isIndeterminate.value) {
    model.value = false;
  } else {
    model.value = !model.value;
  }
}
</script>

<template>
  <button
    :id="id"
    type="button"
    role="checkbox"
    :aria-checked="isIndeterminate ? 'mixed' : isChecked"
    :disabled="disabled"
    :name="name"
    :required="required"
    :value="value"
    class="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
    @click="handleClick"
  >
    <span class="flex h-full w-full items-center justify-center">
      <svg
        v-if="isIndeterminate"
        width="15"
        height="15"
        viewBox="0 0 15 15"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2.5 7.5H12.5"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <Check v-else-if="isChecked" class="h-3 w-3" />
    </span>
  </button>
</template>
