import { defineRouteMeta } from "nitro";
import { defineHandler, getRouterParam } from "nitro/h3";
import { fetchWord } from "../../../../utils/queries";

defineRouteMeta({
  openAPI: {
    tags: ["Word"],
    summary: "Word tenses",
    description:
      "Returns inflected tense forms for the word (base, past, present, future, singular, plural). Returns null if the word has no known tenses.",
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
                tenses: {
                  type: "object",
                  nullable: true,
                  properties: {
                    base: { type: "string" },
                    past: { type: "string" },
                    present: { type: "string" },
                    future: { type: "string" },
                    singular: { type: "string" },
                    plural: { type: "string" },
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
    tenses: record.tenses ?? null,
  };
});
