import { defineRouteMeta } from "nitro";
import { defineHandler, readBody, setResponseStatus } from "nitro/h3";
import { createWord } from "../../utils/mutations";

defineRouteMeta({
  openAPI: {
    tags: ["Words"],
    summary: "Create word entry",
    description:
      "Creates a new word entry with its meanings, phonetics, and translations. WARNING: No authentication — for local use only.",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            required: ["word", "edition", "meanings", "phonetics", "translations"],
            properties: {
              word: { type: "string" },
              edition: { type: "string", example: "en" },
              phonetic: { type: "string", nullable: true },
              phonetics: { type: "array", items: { type: "object" } },
              meanings: { type: "array", items: { type: "object" } },
              translations: { type: "array", items: { type: "object" } },
              tenses: { type: "object", nullable: true },
            },
          },
        },
      },
    },
    responses: {
      201: { description: "Word created successfully." },
      400: { description: "Invalid request body." },
    },
  },
});

export default defineHandler(async (event) => {
  const body = await readBody(event);
  const record = createWord(body);
  setResponseStatus(event, 201);
  return record;
});
