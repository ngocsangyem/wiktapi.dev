import { defineRouteMeta } from "nitro";
import { defineHandler, getRouterParam, getQuery, setResponseStatus } from "nitro/h3";
import { deleteWordById } from "../../../utils/mutations";

defineRouteMeta({
  openAPI: {
    tags: ["Words"],
    summary: "Delete word by ID",
    parameters: [
      {
        in: "path",
        name: "id",
        required: true,
        schema: { type: "string" },
      },
    ],
    responses: {
      204: { description: "Word deleted successfully." },
      404: { description: "Word not found." },
    },
  },
});

export default defineHandler((event) => {
  const id = getRouterParam(event, "id")!;
  const { edition, category } = getQuery(event) as { edition?: string; category?: string };
  deleteWordById(id, edition, category);
  setResponseStatus(event, 204);
  return null;
});
