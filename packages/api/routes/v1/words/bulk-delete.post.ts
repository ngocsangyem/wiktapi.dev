import { defineRouteMeta } from "nitro";
import { defineHandler, readBody, setResponseStatus } from "nitro/h3";
import { bulkDeleteWords } from "../../../utils/mutations";

defineRouteMeta({
  openAPI: {
    tags: ["Words"],
    summary: "Bulk delete words",
    description: "Deletes multiple words at once. WARNING: No authentication — for local use only.",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              words: {
                type: "array",
                items: { type: "string" },
                description: "Array of words to delete",
              },
            },
            required: ["words"],
          },
        },
      },
    },
    responses: {
      204: { description: "Words deleted successfully." },
      400: { description: "Invalid request body." },
    },
  },
});

export default defineHandler(async (event) => {
  const body = (await readBody(event)) as { words?: unknown } | null;
  if (!body || !Array.isArray(body.words)) {
    setResponseStatus(event, 400);
    return { error: "Request body must contain a 'words' array" };
  }

  bulkDeleteWords(body.words as string[]);
  setResponseStatus(event, 204);
  return null;
});
