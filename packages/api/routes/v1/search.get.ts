import { defineRouteMeta } from "nitro";
import { defineHandler, getQuery, createError } from "nitro/h3";
import { searchWords } from "../../utils/queries";

defineRouteMeta({
  openAPI: {
    tags: ["Search"],
    summary: "Search words",
    description:
      "Returns up to 50 words matching the query, optionally filtered by category. Use regex=true for regex matching.",
    parameters: [
      {
        in: "query",
        name: "q",
        required: true,
        schema: { type: "string" },
        description: "Search query (prefix or regex pattern).",
      },
      {
        in: "query",
        name: "category",
        required: false,
        schema: { type: "string" },
        description: "Filter by category (e.g. `sports`, `technology`).",
      },
      {
        in: "query",
        name: "regex",
        required: false,
        schema: { type: "boolean" },
        description: "Enable regex matching (default: false for prefix search).",
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
  const { q, category, regex } = getQuery(event) as {
    q?: string;
    category?: string;
    regex?: string;
  };

  if (!q?.trim()) {
    throw createError({ statusCode: 400, message: "Missing required query param: q" });
  }

  const isRegex = regex === "true" || regex === "1";

  // Decode q for regex mode (URLSearchParams encodes special chars)
  let query = q;
  if (isRegex) {
    try {
      query = decodeURIComponent(q);
    } catch {
      // Use original if decode fails (already decoded or invalid)
      query = q;
    }
  }
  return { results: searchWords(query.trim(), category, isRegex) };
});
