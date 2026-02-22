<script setup lang="ts">
import { h, watch, ref } from "vue";
import { RouterLink } from "vue-router";
import { useVueTable, getCoreRowModel, FlexRender, type ColumnDef } from "@tanstack/vue-table";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import type { WordListItem } from "@/types/word";

const props = defineProps<{
  words: WordListItem[];
  loading: boolean;
}>();

const emit = defineEmits<{
  delete: [word: string];
  "update:selected": [words: string[]];
}>();

function valueUpdater(updater: (value: unknown) => unknown, ref: { value: unknown }) {
  ref.value = updater(ref.value);
}

const rowSelection = ref<Record<number, boolean>>({});

const columns: ColumnDef<WordListItem>[] = [
  {
    id: "select",
    header: ({ table }) =>
      h(Checkbox, {
        modelValue:
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate"),
        "onUpdate:modelValue": (value) => table.toggleAllPageRowsSelected(!!value),
        "aria-label": "Select all",
      }),
    cell: ({ row }) =>
      h(Checkbox, {
        modelValue: row.getIsSelected(),
        "onUpdate:modelValue": (value) => row.toggleSelected(!!value),
        "aria-label": "Select row",
      }),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "word",
    header: "Word",
    cell: ({ row }) =>
      h(
        RouterLink,
        {
          to: `/words/${encodeURIComponent(row.original.word)}`,
          class: "font-medium hover:underline",
        },
        () => row.original.word,
      ),
  },
  {
    accessorKey: "edition",
    header: "Edition",
    cell: ({ row }) => h(Badge, { variant: "secondary" }, () => row.original.edition),
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => h(Badge, { variant: "outline" }, () => row.original.category),
  },
  {
    accessorKey: "phonetic",
    header: "Phonetic",
    cell: ({ row }) =>
      row.original.phonetic
        ? h("span", { class: "text-muted-foreground font-mono text-xs" }, row.original.phonetic)
        : h("span", { class: "text-muted-foreground" }, "—"),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-2 justify-end" }, [
        h(RouterLink, { to: `/words/${encodeURIComponent(row.original.word)}` }, () =>
          h(Button, { variant: "ghost", size: "sm" }, () => "Edit"),
        ),
        h(
          Button,
          {
            variant: "ghost",
            size: "sm",
            class: "text-destructive hover:text-destructive",
            onClick: () => emit("delete", row.original.word),
          },
          () => "Delete",
        ),
      ]),
  },
];

const table = useVueTable({
  get data() {
    return props.words;
  },
  columns,
  getCoreRowModel: getCoreRowModel(),
  onRowSelectionChange: (updaterOrValue) => {
    rowSelection.value =
      typeof updaterOrValue === "function" ? updaterOrValue(rowSelection.value) : updaterOrValue;
  },
  state: {
    get rowSelection() {
      return rowSelection.value;
    },
  },
});

// Watch row selection and emit selected words
watch(
  rowSelection,
  (selection) => {
    const selected = props.words.filter((_, index) => selection[index]).map((w) => w.word);
    emit("update:selected", selected);
  },
  { deep: true },
);

// Reset selection when words change
watch(
  () => props.words,
  () => {
    rowSelection.value = {};
  },
);
</script>

<template>
  <div class="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
          <TableHead v-for="header in headerGroup.headers" :key="header.id">
            <FlexRender
              v-if="!header.isPlaceholder"
              :render="header.column.columnDef.header"
              :props="header.getContext()"
            />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="loading">
          <TableRow v-for="i in 5" :key="i">
            <TableCell v-for="j in 6" :key="j">
              <Skeleton class="h-4 w-full" />
            </TableCell>
          </TableRow>
        </template>
        <template v-else-if="table.getRowModel().rows.length">
          <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
            <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
              <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
            </TableCell>
          </TableRow>
        </template>
        <TableEmpty v-else :colspan="columns.length" class="h-24 text-center text-muted-foreground">
          No words found.
        </TableEmpty>
      </TableBody>
    </Table>
  </div>
</template>
