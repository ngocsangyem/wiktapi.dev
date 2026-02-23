import { describe, it, expect } from "vite-plus/test";
import { createTestEvent, call } from "../helpers/event.ts";
import searchHandler from "../../routes/v1/search.get";

describe("GET /v1/search", () => {
  it("returns prefix matches", async () => {
    const event = createTestEvent({}, { q: "ch" });
    const result = searchHandler(event);

    const words = result.results.map((r: { word: string }) => r.word);
    expect(words).toContain("chat");
  });

  it("returns id, word, and phonetic in each result", async () => {
    const event = createTestEvent({}, { q: "ch" });
    const result = searchHandler(event);

    const item = result.results[0];
    expect(typeof item?.id).toBe("string");
    expect(typeof item?.word).toBe("string");
    expect(item && "phonetic" in item).toBe(true);
  });

  it("returns 400 when q is missing", async () => {
    const event = createTestEvent({});
    await expect(call(searchHandler, event)).rejects.toSatisfy((e: any) => e.statusCode === 400);
  });

  it("returns empty results for no match", async () => {
    const event = createTestEvent({}, { q: "xyzxyz" });
    const result = searchHandler(event);

    expect(result.results).toHaveLength(0);
  });

  it("is case-insensitive", async () => {
    const event = createTestEvent({}, { q: "CHAT" });
    const result = searchHandler(event);

    const words = result.results.map((r: { word: string }) => r.word);
    expect(words).toContain("chat");
  });
});
