import { defineRouteMeta } from "nitro";
import { defineHandler, getRouterParam } from "nitro/h3";
import { fetchWordById } from "../../../utils/queries";

defineRouteMeta({
  openAPI: {
    tags: ["Words"],
    summary: "Get word by ID",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string" },
      },
    ],
  },
});

export default defineHandler((event) => {
  const id = getRouterParam(event, "id")!;
  const record = fetchWordById(id);
  return {
    word: record.word,
    edition: record.edition,
    phonetic: record.phonetic,
    phonetics: record.phonetics,
    meanings: record.meanings,
    translations: record.translations,
    tenses: record.tenses ?? null,
  };
});
