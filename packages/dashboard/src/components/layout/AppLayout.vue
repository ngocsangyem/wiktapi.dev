<script setup lang="ts">
import AppSidebar from "./AppSidebar.vue";
import AppHeader from "./AppHeader.vue";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <AppHeader />
      <div class="flex-1 overflow-auto p-6">
        <router-view />
      </div>
    </SidebarInset>
  </SidebarProvider>
</template>
