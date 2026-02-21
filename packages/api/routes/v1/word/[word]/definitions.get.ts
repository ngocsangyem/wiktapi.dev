import { defineRouteMeta } from "nitro";
import { defineHandler, getRouterParam } from "nitro/h3";
import { fetchWord } from "../../../../utils/queries";

defineRouteMeta({
  openAPI: {
    tags: ["Word"],
    summary: "Word definitions",
    description:
      "Returns meanings with part-of-speech, definitions, examples, synonyms, and antonyms.",
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
                meanings: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      partOfSpeech: { type: "string", example: "noun" },
                      definitions: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            definition: { type: "string" },
                            example: { type: "string", nullable: true },
                          },
                        },
                      },
                      translate: { type: "string", nullable: true },
                      synonyms: { type: "array", items: { type: "string" } },
                      antonyms: { type: "array", items: { type: "string" } },
                    },
                  },
                },
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
  return { word: record.word, edition: record.edition, meanings: record.meanings };
});
