import { defineRouteMeta } from "nitro";
import { defineHandler, getRouterParam, getQuery, setResponseStatus } from "nitro/h3";
import { deleteWord } from "../../../utils/mutations";

defineRouteMeta({
  openAPI: {
    tags: ["Words"],
    summary: "Delete word entry",
    description:
      "Deletes all rows for a word, optionally filtered by edition and category. WARNING: No authentication — for local use only.",
    parameters: [
      {
        in: "path",
        name: "word",
        required: true,
        schema: { type: "string" },
        description: "The word to delete.",
      },
      {
        in: "query",
        name: "edition",
        required: false,
        schema: { type: "string" },
        description: "Limit deletion to a specific edition.",
      },
      {
        in: "query",
        name: "category",
        required: false,
        schema: { type: "string" },
        description: "Limit deletion to a specific category.",
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
  const { edition, category } = getQuery(event) as { edition?: string; category?: string };
  deleteWord(word, edition, category);
  setResponseStatus(event, 204);
  return null;
});
