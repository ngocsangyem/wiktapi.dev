import { defineRouteMeta } from "nitro";
import { defineHandler, getRouterParam } from "nitro/h3";
import { fetchWord } from "../../../../utils/queries";

defineRouteMeta({
  openAPI: {
    tags: ["Word"],
    summary: "Word synonyms & antonyms",
    description:
      "Returns synonyms and antonyms aggregated across all meanings of the word, deduplicated.",
    parameters: [
      {
        in: "path",
        name: "word",
        required: true,
        schema: { type: "string" },
        description: "The word to look up.",
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
                synonyms: { type: "array", items: { type: "string" } },
                antonyms: { type: "array", items: { type: "string" } },
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
  const record = fetchWord(word);

  const synonyms = [...new Set(record.meanings.flatMap((m) => m.synonyms ?? []))];
  const antonyms = [...new Set(record.meanings.flatMap((m) => m.antonyms ?? []))];

  return { word: record.word, edition: record.edition, synonyms, antonyms };
});
