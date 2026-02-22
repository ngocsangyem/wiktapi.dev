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
      path: "/words/:word",
      name: "word-detail",
      component: () => import("@/pages/WordDetailPage.vue"),
      props: true,
    },
  ],
});
