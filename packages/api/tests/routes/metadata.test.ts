import { describe, it, expect } from "vite-plus/test";
import { createTestEvent } from "../helpers/event.ts";
import categoriesHandler from "../../routes/v1/categories.get";

describe("GET /v1/categories", () => {
  it("returns empty array (categories deprecated)", () => {
    const result = categoriesHandler(createTestEvent());

    expect(Array.isArray(result.categories)).toBe(true);
    expect(result.categories).toHaveLength(0);
  });
});
