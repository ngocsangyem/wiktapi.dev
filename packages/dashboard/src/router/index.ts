import { createRouter, createWebHistory } from "vue-router";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", redirect: "/words" },
    {
      path: "/words",
      name: "words",
      component: () => import("@/pages/WordsPage.vue"),
    },
    {
      path: "/words/new",
      name: "word-create",
      component: () => import("@/pages/WordCreatePage.vue"),
    },
    {
      path: "/words/:id",
      name: "word-detail",
      component: () => import("@/pages/WordDetailPage.vue"),
      props: true,
    },
    {
      path: "/bulk-generate",
      name: "bulk-generate",
      component: () => import("@/pages/BulkGeneratePage.vue"),
    },
    {
      path: "/ai-failures",
      name: "ai-failures",
      component: () => import("@/pages/AiFailuresPage.vue"),
    },
  ],
});
