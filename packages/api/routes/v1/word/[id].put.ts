import { defineRouteMeta } from "nitro";
import { defineHandler, readBody, getRouterParam, getQuery } from "nitro/h3";
import { updateWordById } from "../../../utils/mutations";

defineRouteMeta({
  openAPI: {
    tags: ["Words"],
    summary: "Update word entry by ID",
    description:
      "Replaces all rows for a word with new data (delete + re-insert). WARNING: No authentication — for local use only.",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string" },
        description: "The ID of the word to update.",
      },
      {
        in: "query",
        name: "edition",
        required: false,
        schema: { type: "string" },
        description: "Filter update to a specific edition.",
      },
      {
        in: "query",
        name: "category",
        required: false,
        schema: { type: "string" },
        description: "Filter update to a specific category.",
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
  const id = getRouterParam(event, "id")!;
  const { edition, category } = getQuery(event) as { edition?: string; category?: string };
  const body = await readBody(event);
  return updateWordById(id, body, edition, category);
});
