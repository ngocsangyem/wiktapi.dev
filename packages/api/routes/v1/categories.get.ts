import { defineRouteMeta } from "nitro";
import { defineHandler } from "nitro/h3";

defineRouteMeta({
  openAPI: {
    tags: ["Meta"],
    summary: "List categories",
    description: "Deprecated — categories have been removed. Returns an empty array.",
    responses: {
      200: {
        description: "OK",
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                categories: { type: "array", items: { type: "string" } },
              },
            },
          },
        },
      },
    },
  },
});

export default defineHandler(() => {
  return { categories: [] };
});
