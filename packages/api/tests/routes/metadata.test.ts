import { describe, it, expect } from "vite-plus/test";
import { createTestEvent } from "../helpers/event.ts";
import categoriesHandler from "../../routes/v1/categories.get";

describe("GET /v1/categories", () => {
  it("returns all distinct categories from the database", () => {
    const result = categoriesHandler(createTestEvent());

    expect(Array.isArray(result.categories)).toBe(true);
    expect(result.categories.length).toBeGreaterThan(0);
  });

  it("contains categories present in sample data", () => {
    const result = categoriesHandler(createTestEvent());

    expect(result.categories).toContain("general");
    expect(result.categories).toContain("sports");
    expect(result.categories).toContain("technology");
  });

  it("returns only string values", () => {
    const result = categoriesHandler(createTestEvent());

    for (const cat of result.categories) {
      expect(typeof cat).toBe("string");
    }
  });

  it("returns categories in alphabetical order", () => {
    const result = categoriesHandler(createTestEvent());
    const sorted = [...result.categories].sort();

    expect(result.categories).toEqual(sorted);
  });
});
