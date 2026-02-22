import { defineRouteMeta } from "nitro";
import { defineHandler, readBody, getRouterParam, getQuery } from "nitro/h3";
import { updateWord } from "../../../utils/mutations";

defineRouteMeta({
  openAPI: {
    tags: ["Words"],
    summary: "Update word entry",
    description:
      "Replaces all rows for a word with new data (delete + re-insert). WARNING: No authentication — for local use only.",
    parameters: [
      {
        in: "path",
        name: "word",
        required: true,
        schema: { type: "string" },
        description: "The word to update.",
      },
      {
        in: "query",
        name: "edition",
        required: false,
        schema: { type: "string" },
        description: "Filter deletion to a specific edition.",
      },
      {
        in: "query",
        name: "category",
        required: false,
        schema: { type: "string" },
        description: "Filter deletion to a specific category.",
      },
    ],
    responses: {
      200: { description: "Word updated successfully." },
      400: { description: "Invalid request body." },
      404: { description: "Word not found." },
    },
  },
});

export default defineHandler(async (event) => {
  const word = getRouterParam(event, "word")!;
  // Decode URL-encoded word, handle already-decoded
  let decodedWord = word;
  try {
    decodedWord = decodeURIComponent(word);
  } catch {
    // Already decoded or invalid, use as-is
  }
  const { edition, category } = getQuery(event) as { edition?: string; category?: string };
  const body = await readBody(event);
  return updateWord(decodedWord, body, edition, category);
});
