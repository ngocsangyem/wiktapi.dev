<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteWordMutation } from "@/queries/words";

const props = defineProps<{ word: string }>();
const router = useRouter();
const deleteMutation = useDeleteWordMutation();
const open = ref(false);

async function handleDelete() {
  await deleteMutation.mutateAsync({ word: props.word });
  open.value = false;
  router.push("/words");
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <AlertDialogTrigger as-child>
      <Button variant="destructive">Delete Word</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete "{{ word }}"?</AlertDialogTitle>
        <AlertDialogDescription>
          This will permanently remove the word and all its data. This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          :disabled="deleteMutation.asyncStatus.value === 'loading'"
          @click.prevent="handleDelete"
        >
          Delete
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
