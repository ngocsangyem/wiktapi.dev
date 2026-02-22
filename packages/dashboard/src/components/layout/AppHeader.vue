<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const route = useRoute();

const title = computed(() => {
  if (route.name === "words") return "Words";
  if (route.name === "word-create") return "Add Word";
  if (route.name === "word-detail") return `Edit: ${route.params.word}`;
  return "Dashboard";
});
</script>

<template>
  <header class="flex h-14 shrink-0 items-center gap-2 border-b px-4">
    <SidebarTrigger class="-ml-1" />
    <Separator orientation="vertical" class="mr-2 h-4" />
    <h1 class="text-sm font-semibold">{{ title }}</h1>
  </header>
</template>
