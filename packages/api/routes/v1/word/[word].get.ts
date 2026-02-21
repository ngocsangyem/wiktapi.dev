import { defineRouteMeta } from "nitro";
import { defineHandler, getRouterParam, getQuery } from "nitro/h3";
import { fetchWord } from "../../../utils/queries";

defineRouteMeta({
  openAPI: {
    tags: ["Word"],
    summary: "Full word entry",
    description:
      "Returns the complete vocabulary entry for a word, including phonetics, meanings, tenses, and category.",
    parameters: [
      {
        in: "path",
        name: "word",
        required: true,
        schema: { type: "string" },
        description: "The word to look up.",
      },
      {
        in: "query",
        name: "category",
        required: false,
        schema: { type: "string" },
        description: "Filter by category (e.g. `sports`, `technology`).",
      },
    ],
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                word: { type: "string" },
                edition: { type: "string", example: "en" },
                phonetic: { type: "string", nullable: true },
                phonetics: { type: "array", items: { type: "object" } },
                meanings: { type: "array", items: { type: "object" } },
                category: { type: "string" },
                translations: { type: "array", items: { type: "object" } },
                tenses: { type: "object", nullable: true },
              },
            },
          },
        },
      },
      404: { description: "Word not found." },
    },
  },
});

export default defineHandler((event) => {
  const word = getRouterParam(event, "word")!;
  const { category } = getQuery(event) as { category?: string };

  const record = fetchWord(word, category);
  return {
    word: record.word,
    edition: record.edition,
    phonetic: record.phonetic,
    phonetics: record.phonetics,
    meanings: record.meanings,
    category: record.category,
    translations: record.translations,
    tenses: record.tenses ?? null,
  };
});
