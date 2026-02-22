<script setup lang="ts">
import { RouterLink, useRoute } from "vue-router";
import { LayoutList, PlusCircle, RotateCcw, BookOpen, Tag, Globe } from "lucide-vue-next";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useCategoriesQuery } from "@/queries/categories";
import { useLanguagesQuery } from "@/queries/languages";
import { useFiltersStore } from "@/stores/filters";

const route = useRoute();
const filters = useFiltersStore();
const { state } = useSidebar();
const { data: categoriesData } = useCategoriesQuery();
const { data: languagesData } = useLanguagesQuery();

const navItems = [
  { to: "/words", label: "Words", icon: LayoutList },
  { to: "/words/new", label: "Add Word", icon: PlusCircle },
];
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" as-child>
            <!-- gap is on the span so it only appears when the span is present -->
            <RouterLink
              to="/words"
              class="flex items-center overflow-hidden"
              :class="{
                'justify-center': state === 'collapsed',
              }"
            >
              <BookOpen class="size-5 shrink-0" />
              <Transition name="sidebar-text">
                <span v-if="state === 'expanded'" class="font-semibold whitespace-nowrap ml-2"
                  >Wordictapi</span
                >
              </Transition>
            </RouterLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in navItems" :key="item.to">
              <SidebarMenuButton as-child :is-active="route.path === item.to">
                <RouterLink :to="item.to" class="flex items-center gap-2">
                  <component :is="item.icon" class="size-4" />
                  <span>{{ item.label }}</span>
                </RouterLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel>Filters</SidebarGroupLabel>
        <SidebarGroupContent>
          <!-- Expanded: full selects -->
          <Transition name="sidebar-filters">
            <div v-if="state === 'expanded'" class="space-y-2 px-2">
              <Select
                :model-value="filters.selectedCategory ?? '_all_'"
                @update:model-value="
                  (v) => (filters.selectedCategory = v === '_all_' ? null : (v as string))
                "
              >
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all_">All categories</SelectItem>
                  <SelectItem
                    v-for="cat in categoriesData?.categories ?? []"
                    :key="cat"
                    :value="cat"
                  >
                    {{ cat }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <Select
                :model-value="filters.selectedEdition ?? '_all_'"
                @update:model-value="
                  (v) => (filters.selectedEdition = v === '_all_' ? null : (v as string))
                "
              >
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="All editions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all_">All editions</SelectItem>
                  <SelectItem
                    v-for="lang in languagesData?.languages ?? []"
                    :key="lang"
                    :value="lang"
                  >
                    {{ lang }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <!-- Collapsed: SidebarMenuButton handles tooltip natively; PopoverTrigger handles click -->
            <div v-else class="flex flex-col items-center gap-1 py-1">
              <Popover>
                <PopoverTrigger as-child>
                  <SidebarMenuButton
                    :tooltip="`Category: ${filters.selectedCategory ?? 'All'}`"
                    class="relative"
                    :data-active="!!filters.selectedCategory"
                  >
                    <Tag class="size-4" />
                    <span
                      v-if="filters.selectedCategory"
                      class="absolute top-1 right-1 size-1.5 rounded-full bg-primary"
                    />
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent side="right" class="w-52 p-3 space-y-2">
                  <p class="text-xs font-medium text-muted-foreground">Category</p>
                  <Select
                    :model-value="filters.selectedCategory ?? '_all_'"
                    @update:model-value="
                      (v) => (filters.selectedCategory = v === '_all_' ? null : (v as string))
                    "
                  >
                    <SelectTrigger class="w-full">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all_">All categories</SelectItem>
                      <SelectItem
                        v-for="cat in categoriesData?.categories ?? []"
                        :key="cat"
                        :value="cat"
                      >
                        {{ cat }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger as-child>
                  <SidebarMenuButton
                    :tooltip="`Edition: ${filters.selectedEdition ?? 'All'}`"
                    class="relative"
                    :data-active="!!filters.selectedEdition"
                  >
                    <Globe class="size-4" />
                    <span
                      v-if="filters.selectedEdition"
                      class="absolute top-1 right-1 size-1.5 rounded-full bg-primary"
                    />
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent side="right" class="w-52 p-3 space-y-2">
                  <p class="text-xs font-medium text-muted-foreground">Edition</p>
                  <Select
                    :model-value="filters.selectedEdition ?? '_all_'"
                    @update:model-value="
                      (v) => (filters.selectedEdition = v === '_all_' ? null : (v as string))
                    "
                  >
                    <SelectTrigger class="w-full">
                      <SelectValue placeholder="All editions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_all_">All editions</SelectItem>
                      <SelectItem
                        v-for="lang in languagesData?.languages ?? []"
                        :key="lang"
                        :value="lang"
                      >
                        {{ lang }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </PopoverContent>
              </Popover>
            </div>
          </Transition>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            class="w-full"
            :disabled="!filters.selectedCategory && !filters.selectedEdition"
            @click="filters.resetFilters"
          >
            <RotateCcw class="size-4" />
            <span>Reset filters</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  </Sidebar>
</template>

<style scoped>
/* Logo title fade — delay enter so sidebar width animates first */
.sidebar-text-enter-active {
  transition: opacity 0.15s ease 0.1s;
}
.sidebar-text-leave-active {
  transition: opacity 0.1s ease;
}
.sidebar-text-enter-from,
.sidebar-text-leave-to {
  opacity: 0;
}

/* Filter panel crossfade between expanded/collapsed modes */
.sidebar-filters-enter-active,
.sidebar-filters-leave-active {
  transition: opacity 0.15s ease;
  position: absolute;
}
.sidebar-filters-enter-from,
.sidebar-filters-leave-to {
  opacity: 0;
}
</style>
