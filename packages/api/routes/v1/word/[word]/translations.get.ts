import { defineRouteMeta } from "nitro";
import { defineHandler, getRouterParam } from "nitro/h3";
import { fetchWord } from "../../../../utils/queries";

defineRouteMeta({
  openAPI: {
    tags: ["Word"],
    summary: "Word translations",
    description: "Returns the overall word translation and per-meaning translations.",
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
                translate: { type: "string", nullable: true },
                meanings: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      partOfSpeech: { type: "string" },
                      translate: { type: "string", nullable: true },
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
  return {
    word: record.word,
    translate: record.translate,
    meanings: record.meanings.map((m) => ({
      partOfSpeech: m.partOfSpeech,
      translate: m.translate,
    })),
  };
});
