import { defineRouteMeta } from "nitro";
import { defineHandler, getQuery, createError } from "nitro/h3";
import { searchWords } from "../../utils/queries";

defineRouteMeta({
  openAPI: {
    tags: ["Search"],
    summary: "Prefix search",
    description:
      "Returns up to 50 words that start with the given prefix, optionally filtered by category.",
    parameters: [
      {
        in: "query",
        name: "q",
        required: true,
        schema: { type: "string" },
        description: "Search prefix.",
      },
      {
        in: "query",
        name: "category",
        required: false,
        schema: { type: "string" },
        description: "Filter by category (e.g. `sports`, `technology`).",
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
                results: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      word: { type: "string" },
                      category: { type: "string" },
                      phonetic: { type: "string", nullable: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
      400: { description: "Missing required query param `q`." },
    },
  },
});

export default defineHandler((event) => {
  const { q, category } = getQuery(event) as { q?: string; category?: string };

  if (!q?.trim()) {
    throw createError({ statusCode: 400, message: "Missing required query param: q" });
  }

  return { results: searchWords(q.trim(), category) };
});
