// Vue SFC shim — tells TypeScript to treat *.vue files as Vue components
declare module "*.vue" {
  import type { Component } from "vue";
  const component: Component;
  export default component;
}

// Vite env vars — extend ImportMeta so import.meta.env.VITE_* is typed
interface ImportMeta {
  readonly env: { readonly VITE_ADMIN_KEY?: string } & Record<string, string | undefined>;
}
