// Vue SFC shim — tells TypeScript to treat *.vue files as Vue components
declare module "*.vue" {
  import type { Component } from "vue";
  const component: Component;
  export default component;
}
