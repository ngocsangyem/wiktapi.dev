import { createApp } from "vue";
import { createPinia } from "pinia";
import { PiniaColada } from "@pinia/colada";
import { router } from "./router";
import App from "./App.vue";
import "./assets/globals.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(PiniaColada);
app.use(router);
app.mount("#app");
