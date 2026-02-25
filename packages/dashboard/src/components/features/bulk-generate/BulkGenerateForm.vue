<script setup lang="ts">
import { ref } from "vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ALL_TASK_TYPES = [
  { group: "Phonetics", tasks: ["generate-ipa", "generate-phonetic-us", "generate-phonetic-uk"] },
  {
    group: "Content",
    tasks: ["generate-example", "generate-synonyms", "generate-antonyms", "generate-tenses"],
  },
  {
    group: "Translations",
    tasks: [
      "generate-translation",
      "generate-definition-translation",
      "generate-example-translation",
    ],
  },
] as const;

type AiTaskType =
  | "generate-ipa"
  | "generate-phonetic-us"
  | "generate-phonetic-uk"
  | "generate-example"
  | "generate-synonyms"
  | "generate-antonyms"
  | "generate-tenses"
  | "generate-translation"
  | "generate-definition-translation"
  | "generate-example-translation";

const emit = defineEmits<{
  start: [
    config: {
      taskTypes: AiTaskType[];
      model: string;
      rpm: number;
      concurrency: number;
      targetLangs: string;
    },
  ];
}>();

const selectedTasks = ref<Set<AiTaskType>>(
  new Set(ALL_TASK_TYPES.flatMap((g) => [...g.tasks]) as AiTaskType[]),
);
const model = ref("google/gemini-2.0-flash-001");
const rpm = ref(30);
const concurrency = ref(3);
const targetLangs = ref("");

function toggleTask(task: AiTaskType): void {
  if (selectedTasks.value.has(task)) {
    selectedTasks.value.delete(task);
  } else {
    selectedTasks.value.add(task);
  }
  selectedTasks.value = new Set(selectedTasks.value);
}

function selectAll(): void {
  selectedTasks.value = new Set(ALL_TASK_TYPES.flatMap((g) => [...g.tasks]) as AiTaskType[]);
}

function deselectAll(): void {
  selectedTasks.value = new Set();
}

function handleStart(): void {
  emit("start", {
    taskTypes: [...selectedTasks.value],
    model: model.value,
    rpm: rpm.value,
    concurrency: concurrency.value,
    targetLangs: targetLangs.value,
  });
}

function taskLabel(task: string): string {
  return task.replace("generate-", "").replace(/-/g, " ");
}
</script>

<template>
  <div class="space-y-6">
    <!-- Task type selection -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <Label class="text-sm font-medium">Task Types</Label>
        <div class="flex gap-2">
          <button class="text-xs text-muted-foreground hover:text-foreground" @click="selectAll">
            Select all
          </button>
          <span class="text-xs text-muted-foreground">/</span>
          <button class="text-xs text-muted-foreground hover:text-foreground" @click="deselectAll">
            Deselect all
          </button>
        </div>
      </div>

      <div v-for="group in ALL_TASK_TYPES" :key="group.group" class="space-y-1.5">
        <p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {{ group.group }}
        </p>
        <div class="flex flex-wrap gap-2">
          <label
            v-for="task in group.tasks"
            :key="task"
            class="flex items-center gap-1.5 cursor-pointer"
          >
            <input
              type="checkbox"
              :checked="selectedTasks.has(task as AiTaskType)"
              class="rounded border-border"
              @change="toggleTask(task as AiTaskType)"
            />
            <span class="text-sm capitalize">{{ taskLabel(task) }}</span>
          </label>
        </div>
      </div>
    </div>

    <!-- Config inputs -->
    <div class="grid grid-cols-2 gap-4">
      <div class="col-span-2 space-y-1.5">
        <Label for="model">Model</Label>
        <Input id="model" v-model="model" placeholder="google/gemini-2.0-flash-001" />
      </div>

      <div class="space-y-1.5">
        <Label for="rpm">RPM Limit</Label>
        <Input id="rpm" v-model.number="rpm" type="number" min="1" max="1000" />
      </div>

      <div class="space-y-1.5">
        <Label for="concurrency">Concurrency</Label>
        <Input id="concurrency" v-model.number="concurrency" type="number" min="1" max="20" />
      </div>

      <div class="col-span-2 space-y-1.5">
        <Label for="target-langs">
          Target Languages
          <span class="text-muted-foreground font-normal">(e.g. vi:Vietnamese,fr:French)</span>
        </Label>
        <Input id="target-langs" v-model="targetLangs" placeholder="vi:Vietnamese,fr:French" />
      </div>
    </div>

    <div class="flex items-center justify-between pt-2">
      <p class="text-sm text-muted-foreground">
        {{ selectedTasks.size }} task type{{ selectedTasks.size !== 1 ? "s" : "" }} selected
      </p>
      <Button :disabled="selectedTasks.size === 0" @click="handleStart"> Start Generation </Button>
    </div>
  </div>
</template>
