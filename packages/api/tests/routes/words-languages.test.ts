import { describe, it, expect } from "vite-plus/test";
import { createTestEvent } from "../helpers/event.ts";
import wordsHandler from "../../routes/v1/words.get";
import languagesHandler from "../../routes/v1/languages.get";

// ── /words ────────────────────────────────────────────────────────────────────

describe("GET /v1/words", () => {
  it("returns paginated list with default page and limit", () => {
    const event = createTestEvent();
    const result = wordsHandler(event);

    expect(typeof result.page).toBe("number");
    expect(typeof result.limit).toBe("number");
    expect(typeof result.total).toBe("number");
    expect(Array.isArray(result.words)).toBe(true);
    expect(result.page).toBe(1);
  });

  it("each word entry has word, edition, category, phonetic fields", () => {
    const event = createTestEvent();
    const result = wordsHandler(event);

    const item = result.words[0];
    expect(typeof item?.word).toBe("string");
    expect(typeof item?.edition).toBe("string");
    expect(typeof item?.category).toBe("string");
    expect("phonetic" in item).toBe(true);
  });

  it("filters by category", () => {
    const event = createTestEvent({}, { category: "sports" });
    const result = wordsHandler(event);

    expect(result.words.every((w: { category: string }) => w.category === "sports")).toBe(true);
  });

  it("filters by edition", () => {
    const event = createTestEvent({}, { edition: "en" });
    const result = wordsHandler(event);

    expect(result.words.every((w: { edition: string }) => w.edition === "en")).toBe(true);
  });

  it("respects limit param", () => {
    const event = createTestEvent({}, { limit: "2" });
    const result = wordsHandler(event);

    expect(result.limit).toBe(2);
    expect(result.words.length).toBeLessThanOrEqual(2);
  });
});

// ── /languages ────────────────────────────────────────────────────────────────

describe("GET /v1/languages", () => {
  it("returns languages array", () => {
    const event = createTestEvent();
    const result = languagesHandler(event);

    expect(Array.isArray(result.languages)).toBe(true);
    expect(result.languages.length).toBeGreaterThan(0);
  });

  it("contains en from sample data", () => {
    const event = createTestEvent();
    const result = languagesHandler(event);

    expect(result.languages).toContain("en");
  });

  it("returns only string values", () => {
    const event = createTestEvent();
    const result = languagesHandler(event);

    expect(result.languages.every((l: unknown) => typeof l === "string")).toBe(true);
  });
});
