import { describe, it, expect } from "vite-plus/test";
import { createTestEvent, call } from "../helpers/event.ts";
import wordHandler from "../../routes/v1/word/[word].get";
import definitionsHandler from "../../routes/v1/word/[word]/definitions.get";
import translationsHandler from "../../routes/v1/word/[word]/translations.get";
import pronunciationsHandler from "../../routes/v1/word/[word]/pronunciations.get";
import tensesHandler from "../../routes/v1/word/[word]/tenses.get";
import synonymsAntonymsHandler from "../../routes/v1/word/[word]/synonyms-antonyms.get";

// ── /word/{word} ─────────────────────────────────────────────────────────────

describe("GET /v1/word/{word}", () => {
  it("returns merged WordData for a word with multiple POS rows", async () => {
    const event = createTestEvent({ word: "run" });
    const result = wordHandler(event);

    expect(result.word).toBe("run");
    expect(result.edition).toBe("en");
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

    expect(result.edition).toBe("en");
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
  it("returns translations array with TranslationItem shape", async () => {
    const event = createTestEvent({ word: "run" });
    const result = translationsHandler(event);

    expect(Array.isArray(result.translations)).toBe(true);
    expect(result.translations.length).toBeGreaterThan(0);
    const item = result.translations[0];
    expect(typeof item?.lang_code).toBe("string");
    expect(typeof item?.code).toBe("string");
    expect(typeof item?.lang).toBe("string");
    expect(typeof item?.word).toBe("string");
    expect(typeof item?.partOfSpeech).toBe("string");
  });

  it("includes French and Vietnamese translations for 'run'", async () => {
    const event = createTestEvent({ word: "run" });
    const result = translationsHandler(event);

    const langCodes = result.translations.map((t: { lang_code: string }) => t.lang_code);
    expect(langCodes).toContain("fr");
    expect(langCodes).toContain("vi");
  });

  it("includes edition field derived from source data", async () => {
    const event = createTestEvent({ word: "run" });
    const result = translationsHandler(event);

    expect(result.edition).toBe("en");
  });

  it("returns empty translations array for untranslated words", async () => {
    const event = createTestEvent({ word: "chat" });
    const result = translationsHandler(event);

    expect(result.translations).toHaveLength(0);
  });
});

// ── /word/{word}/pronunciations ───────────────────────────────────────────────

describe("GET /v1/word/{word}/pronunciations", () => {
  it("returns phonetic string and phonetics array", async () => {
    const event = createTestEvent({ word: "chat" });
    const result = pronunciationsHandler(event);

    expect(result.edition).toBe("en");
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

    expect(result.edition).toBe("en");
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

// ── /word/{word}/synonyms-antonyms ────────────────────────────────────────────

describe("GET /v1/word/{word}/synonyms-antonyms", () => {
  it("returns aggregated synonyms across all meanings", async () => {
    const event = createTestEvent({ word: "chat" });
    const result = synonymsAntonymsHandler(event);

    expect(result.edition).toBe("en");
    expect(result.synonyms).toContain("talk");
    expect(result.synonyms).toContain("conversation");
  });

  it("deduplicates synonyms that appear in multiple meanings", async () => {
    const event = createTestEvent({ word: "run" });
    const result = synonymsAntonymsHandler(event);

    const unique = new Set(result.synonyms);
    expect(unique.size).toBe(result.synonyms.length);
  });

  it("returns empty arrays when no synonyms or antonyms exist", async () => {
    const event = createTestEvent({ word: "technology" });
    const result = synonymsAntonymsHandler(event);

    // technology sample has synonyms but no antonyms
    expect(Array.isArray(result.antonyms)).toBe(true);
  });

  it("returns 404 for unknown word", async () => {
    const event = createTestEvent({ word: "xyzunknown" });
    await expect(call(synonymsAntonymsHandler, event)).rejects.toSatisfy(
      (e: any) => e.statusCode === 404,
    );
  });
});
