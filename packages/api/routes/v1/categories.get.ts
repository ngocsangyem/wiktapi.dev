import { defineRouteMeta } from "nitro";
import { defineHandler } from "nitro/h3";
import { db } from "../../utils/db";

defineRouteMeta({
  openAPI: {
    tags: ["Meta"],
    summary: "List categories",
    description: "Returns all word categories available in the database.",
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                categories: {
                  type: "array",
                  items: { type: "string" },
                  example: ["general", "technology", "sports"],
                },
              },
            },
          },
        },
      },
    },
  },
});

export default defineHandler(() => {
  const rows = db.prepare("SELECT DISTINCT category FROM words ORDER BY category").all() as {
    category: string;
  }[];

  return { categories: rows.map((r) => r.category) };
});
