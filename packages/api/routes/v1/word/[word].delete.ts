import { defineRouteMeta } from "nitro";
import { defineHandler, getRouterParam, setResponseStatus } from "nitro/h3";
import { deleteWord } from "../../../utils/mutations";

defineRouteMeta({
  openAPI: {
    tags: ["Words"],
    summary: "Delete word entry",
    description:
      "Deletes a word and all its meanings. WARNING: No authentication — for local use only.",
    parameters: [
      {
        in: "path",
        name: "word",
        required: true,
        schema: { type: "string" },
        description: "The word to delete.",
      },
    ],
    responses: {
      204: { description: "Word deleted successfully." },
      404: { description: "Word not found." },
    },
  },
});

export default defineHandler((event) => {
  const word = getRouterParam(event, "word")!;
  let decodedWord = word;
  try {
    decodedWord = decodeURIComponent(word);
  } catch {
    // Already decoded or invalid, use as-is
  }
  deleteWord(decodedWord);
  setResponseStatus(event, 204);
  return null;
});
