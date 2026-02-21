import { defineRouteMeta } from "nitro";
import { defineHandler, getQuery } from "nitro/h3";
import { db } from "../../utils/db";

defineRouteMeta({
  openAPI: {
    tags: ["Words"],
    summary: "List words",
    description:
      "Returns a paginated list of words in the database, optionally filtered by category or edition.",
    parameters: [
      {
        in: "query",
        name: "page",
        required: false,
        schema: { type: "integer", default: 1 },
        description: "Page number (1-based).",
      },
      {
        in: "query",
        name: "limit",
        required: false,
        schema: { type: "integer", default: 50, maximum: 200 },
        description: "Number of results per page (max 200).",
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
        name: "edition",
        required: false,
        schema: { type: "string" },
        description: "Filter by source edition (e.g. `en`, `fr`).",
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
                page: { type: "integer" },
                limit: { type: "integer" },
                total: { type: "integer" },
                words: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      word: { type: "string" },
                      edition: { type: "string", example: "en" },
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
    },
  },
});

export default defineHandler((event) => {
  const query = getQuery(event) as {
    page?: string;
    limit?: string;
    category?: string;
    edition?: string;
  };

  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit ?? "50", 10) || 50));
  const offset = (page - 1) * limit;

  // Build WHERE clause from optional filters
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.category) {
    conditions.push("category = ?");
    params.push(query.category);
  }
  if (query.edition) {
    conditions.push("edition = ?");
    params.push(query.edition);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  type Row = { word: string; edition: string; category: string; phonetic: string | null };

  const words = db
    .prepare(
      `SELECT word, edition, category, MAX(phonetic) AS phonetic FROM words
       ${where}
       GROUP BY word, edition, category
       ORDER BY word
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as Row[];

  const { total } = db
    .prepare(
      `SELECT COUNT(DISTINCT word || '|' || edition || '|' || category) AS total FROM words ${where}`,
    )
    .get(...params) as { total: number };

  return { page, limit, total, words };
});
