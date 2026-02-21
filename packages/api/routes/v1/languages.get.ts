import { defineRouteMeta } from "nitro";
import { defineHandler } from "nitro/h3";
import { db } from "../../utils/db";

defineRouteMeta({
  openAPI: {
    tags: ["Meta"],
    summary: "List languages",
    description: "Returns all Wiktionary edition language codes available in the database.",
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                languages: {
                  type: "array",
                  items: { type: "string" },
                  example: ["de", "en", "fr"],
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
  const rows = db.prepare("SELECT DISTINCT edition FROM words ORDER BY edition").all() as {
    edition: string;
  }[];

  return { languages: rows.map((r) => r.edition) };
});
