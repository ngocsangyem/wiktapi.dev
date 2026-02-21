import { defineRouteMeta } from "nitro";
import { defineHandler, getRouterParam } from "nitro/h3";
import { fetchWord } from "../../../../utils/queries";

defineRouteMeta({
  openAPI: {
    tags: ["Word"],
    summary: "Word translations",
    description:
      "Returns all translations for a word across all parts of speech, aggregated from the source edition.",
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
                translations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      partOfSpeech: { type: "string" },
                      lang_code: { type: "string", example: "vi" },
                      code: { type: "string", example: "vi" },
                      lang: { type: "string", example: "Vietnamese" },
                      word: { type: "string" },
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
    edition: record.edition,
    translations: record.translations,
  };
});
