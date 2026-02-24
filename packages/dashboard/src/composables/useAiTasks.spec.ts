import { describe, expect, it } from "vite-plus/test";
import { detectMissingData } from "./useAiTasks";
import type { WordData } from "@/types/word";

const BASE_WORD: WordData = {
  word: "example",
  edition: "en",
  phonetic: "/ɪɡˈzæmpəl/",
  phonetics: [
    { type: "us", text: "/ɪɡˈzæmpəl/" },
    { type: "uk", text: "/ɪɡˈzɑːmpəl/" },
  ],
  meanings: [
    {
      partOfSpeech: "noun",
      definitions: [{ definition: "A representative form.", example: "This is an example." }],
      translations: [],
      synonyms: ["instance", "case"],
      antonyms: ["exception"],
    },
  ],
  translations: [],
};

describe("detectMissingData", () => {
  it("returns empty array for fully populated word", () => {
    expect(detectMissingData(BASE_WORD)).toHaveLength(0);
  });

  it("detects missing IPA phonetic", () => {
    const form: WordData = { ...BASE_WORD, phonetic: null };
    const tasks = detectMissingData(form);
    expect(tasks.some((t) => t.type === "generate-ipa")).toBe(true);
  });

  it("detects missing US phonetic", () => {
    const form: WordData = {
      ...BASE_WORD,
      phonetics: [{ type: "uk", text: "/ɪɡˈzɑːmpəl/" }],
    };
    const tasks = detectMissingData(form);
    expect(tasks.some((t) => t.type === "generate-phonetic-us")).toBe(true);
    expect(tasks.some((t) => t.type === "generate-phonetic-uk")).toBe(false);
  });

  it("detects missing UK phonetic", () => {
    const form: WordData = {
      ...BASE_WORD,
      phonetics: [{ type: "us", text: "/ɪɡˈzæmpəl/" }],
    };
    const tasks = detectMissingData(form);
    expect(tasks.some((t) => t.type === "generate-phonetic-uk")).toBe(true);
    expect(tasks.some((t) => t.type === "generate-phonetic-us")).toBe(false);
  });

  it("detects missing example for each definition", () => {
    const form: WordData = {
      ...BASE_WORD,
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [
            { definition: "First definition" },
            { definition: "Second definition", example: "Already has example." },
          ],
          translations: [],
          synonyms: ["a"],
          antonyms: ["b"],
        },
      ],
    };
    const tasks = detectMissingData(form);
    const exampleTasks = tasks.filter((t) => t.type === "generate-example");
    expect(exampleTasks).toHaveLength(1);
    expect(exampleTasks[0].id).toBe("example-0-0");
  });

  it("detects missing synonyms and antonyms", () => {
    const form: WordData = {
      ...BASE_WORD,
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [{ definition: "A definition.", example: "Example." }],
          translations: [],
          synonyms: [],
          antonyms: undefined,
        },
      ],
    };
    const tasks = detectMissingData(form);
    expect(tasks.some((t) => t.type === "generate-synonyms")).toBe(true);
    expect(tasks.some((t) => t.type === "generate-antonyms")).toBe(true);
  });

  it("assigns unique IDs across multiple meanings", () => {
    const form: WordData = {
      ...BASE_WORD,
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [{ definition: "Def 1" }],
          translations: [],
          synonyms: [],
          antonyms: [],
        },
        {
          partOfSpeech: "verb",
          definitions: [{ definition: "Def 2" }],
          translations: [],
          synonyms: [],
          antonyms: [],
        },
      ],
    };
    const tasks = detectMissingData(form);
    const ids = tasks.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all tasks start with idle status", () => {
    const form: WordData = { ...BASE_WORD, phonetic: null };
    const tasks = detectMissingData(form);
    expect(tasks.every((t) => t.status === "idle")).toBe(true);
  });
});
