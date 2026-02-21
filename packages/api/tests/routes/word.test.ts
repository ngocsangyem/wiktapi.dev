import { describe, it, expect } from "vite-plus/test";
import { createTestEvent, call } from "../helpers/event.ts";
import wordHandler from "../../routes/v1/word/[word].get";
import definitionsHandler from "../../routes/v1/word/[word]/definitions.get";
import translationsHandler from "../../routes/v1/word/[word]/translations.get";
import pronunciationsHandler from "../../routes/v1/word/[word]/pronunciations.get";
import tensesHandler from "../../routes/v1/word/[word]/tenses.get";

// ── /word/{word} ─────────────────────────────────────────────────────────────

describe("GET /v1/word/{word}", () => {
  it("returns merged WordData for a word with multiple POS rows", async () => {
    const event = createTestEvent({ word: "run" });
    const result = wordHandler(event);

    expect(result.word).toBe("run");
    expect(result.category).toBe("sports");
    expect(result.phonetic).toBe("/ɹʌn/");
    // two rows (noun + verb) → two meanings merged
    expect(result.meanings).toHaveLength(2);
  });

  it("returns phonetics array with uk/us types", async () => {
    const event = createTestEvent({ word: "chat" });
    const result = wordHandler(event);

    expect(Array.isArray(result.phonetics)).toBe(true);
    const types = result.phonetics.map((p: { type: string }) => p.type);
    expect(types).toContain("us");
    expect(types).toContain("uk");
  });

  it("filters by category when ?category= is provided", async () => {
    const event = createTestEvent({ word: "run" }, { category: "sports" });
    const result = wordHandler(event);

    expect(result.category).toBe("sports");
  });

  it("returns 404 for unknown word", async () => {
    const event = createTestEvent({ word: "xyzunknown" });
    await expect(call(wordHandler, event)).rejects.toSatisfy((e: any) => e.statusCode === 404);
  });
});

// ── /word/{word}/definitions ──────────────────────────────────────────────────

describe("GET /v1/word/{word}/definitions", () => {
  it("returns meanings with partOfSpeech and definitions", async () => {
    const event = createTestEvent({ word: "run" });
    const result = definitionsHandler(event);

    expect(result.meanings).toHaveLength(2);
    const posList = result.meanings.map((m: { partOfSpeech: string }) => m.partOfSpeech);
    expect(posList).toContain("noun");
    expect(posList).toContain("verb");
  });

  it("includes definitions array in each meaning", async () => {
    const event = createTestEvent({ word: "chat" });
    const result = definitionsHandler(event);

    expect(result.meanings[0]?.definitions[0]?.definition).toBeTruthy();
  });

  it("includes synonyms on meanings that have them", async () => {
    const event = createTestEvent({ word: "chat" });
    const result = definitionsHandler(event);

    const nounMeaning = result.meanings.find(
      (m: { partOfSpeech: string }) => m.partOfSpeech === "noun",
    );
    expect(nounMeaning?.synonyms).toContain("talk");
  });
});

// ── /word/{word}/translations ─────────────────────────────────────────────────

describe("GET /v1/word/{word}/translations", () => {
  it("returns word-level translate field", async () => {
    const event = createTestEvent({ word: "run" });
    const result = translationsHandler(event);

    expect(result.translate).toBe("courir");
  });

  it("returns per-meaning translate fields", async () => {
    const event = createTestEvent({ word: "run" });
    const result = translationsHandler(event);

    const verbMeaning = result.meanings.find(
      (m: { partOfSpeech: string }) => m.partOfSpeech === "verb",
    );
    expect(verbMeaning?.translate).toBe("courir");
  });

  it("returns null translate for untranslated words", async () => {
    const event = createTestEvent({ word: "chat" });
    const result = translationsHandler(event);

    expect(result.translate).toBeNull();
  });
});

// ── /word/{word}/pronunciations ───────────────────────────────────────────────

describe("GET /v1/word/{word}/pronunciations", () => {
  it("returns phonetic string and phonetics array", async () => {
    const event = createTestEvent({ word: "chat" });
    const result = pronunciationsHandler(event);

    expect(result.phonetic).toBe("/tʃæt/");
    expect(result.phonetics).toHaveLength(2);
  });

  it("each phonetic item has text, type, and audioUrl", async () => {
    const event = createTestEvent({ word: "technology" });
    const result = pronunciationsHandler(event);

    for (const p of result.phonetics) {
      expect(typeof p.text).toBe("string");
      expect(["uk", "us"]).toContain(p.type);
      expect("audioUrl" in p).toBe(true);
    }
  });
});

// ── /word/{word}/tenses ────────────────────────────────────────────────────────

describe("GET /v1/word/{word}/tenses", () => {
  it("returns tenses for inflected words", async () => {
    const event = createTestEvent({ word: "run" });
    const result = tensesHandler(event);

    expect(result.tenses).not.toBeNull();
    expect(result.tenses?.base).toBe("run");
    expect(result.tenses?.past).toBe("ran");
    expect(result.tenses?.singular).toBe("runs");
  });

  it("returns null tenses for uninflected words", async () => {
    const event = createTestEvent({ word: "chat" });
    const result = tensesHandler(event);

    expect(result.tenses).toBeNull();
  });
});
