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
      definitions: [
        {
          text: "A representative form.",
          example: { text: "This is an example.", translations: [] },
          translations: [],
        },
      ],
      synonyms: ["instance", "case"],
      antonyms: ["exception"],
    },
  ],
  tenses: {
    base_form: "example",
    past_simple: "exampled",
    past_participle: "exampled",
    present_simple: { singular: "examples", plural: "example" },
    present_participle: "exampling",
    future: "will example",
  },
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

  it("detects missing past_participle in tenses", () => {
    const form: WordData = {
      ...BASE_WORD,
      tenses: {
        ...BASE_WORD.tenses!,
        past_participle: null,
      },
    };
    const tasks = detectMissingData(form);
    expect(tasks.some((t) => t.type === "generate-tenses")).toBe(true);
  });

  it("detects missing example for each definition", () => {
    const form: WordData = {
      ...BASE_WORD,
      meanings: [
        {
          partOfSpeech: "noun",
          definitions: [
            { text: "First definition", translations: [] },
            {
              text: "Second definition",
              example: { text: "Already has example.", translations: [] },
              translations: [],
            },
          ],
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
          definitions: [
            {
              text: "A definition.",
              example: { text: "Example.", translations: [] },
              translations: [],
            },
          ],
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
          definitions: [{ text: "Def 1", translations: [] }],
          synonyms: [],
          antonyms: [],
        },
        {
          partOfSpeech: "verb",
          definitions: [{ text: "Def 2", translations: [] }],
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

  it("detects missing translation for each target language", () => {
    const langs = [
      { lang_code: "vi", lang: "Vietnamese" },
      { lang_code: "fr", lang: "French" },
    ];
    const tasks = detectMissingData(BASE_WORD, langs);
    const translationTasks = tasks.filter((t) => t.type === "generate-translation");
    expect(translationTasks).toHaveLength(2);
    expect(translationTasks[0].id).toBe("translation-vi");
    expect(translationTasks[1].id).toBe("translation-fr");
  });

  it("skips translation task when translation already exists for that language", () => {
    const form: WordData = {
      ...BASE_WORD,
      translations: [
        { lang_code: "vi", code: "vi", lang: "Vietnamese", word: "ví dụ", partOfSpeech: "danh từ" },
      ],
    };
    const langs = [{ lang_code: "vi", lang: "Vietnamese" }];
    const tasks = detectMissingData(form, langs);
    expect(tasks.some((t) => t.type === "generate-translation")).toBe(false);
  });

  it("no translation tasks when targetLanguages is empty", () => {
    const tasks = detectMissingData(BASE_WORD);
    expect(tasks.some((t) => t.type === "generate-translation")).toBe(false);
  });

  it("detects missing definition translation per target language", () => {
    const langs = [{ lang_code: "vi", lang: "Vietnamese" }];
    const tasks = detectMissingData(BASE_WORD, langs);
    const defTrTasks = tasks.filter((t) => t.type === "generate-definition-translation");
    expect(defTrTasks.length).toBeGreaterThan(0);
    expect(defTrTasks[0].id).toBe("def-tr-0-0-vi");
    expect(defTrTasks[0].context.mi).toBe("0");
    expect(defTrTasks[0].context.di).toBe("0");
    expect(defTrTasks[0].context.targetLangCode).toBe("vi");
  });

  it("skips definition translation when already present for that language", () => {
    const langs = [{ lang_code: "vi", lang: "Vietnamese" }];
    const form: WordData = {
      ...BASE_WORD,
      meanings: [
        {
          ...BASE_WORD.meanings[0],
          definitions: [
            {
              ...BASE_WORD.meanings[0].definitions[0],
              translations: [
                {
                  lang_code: "vi",
                  code: "vi",
                  lang: "Vietnamese",
                  word: "ví dụ",
                  partOfSpeech: "danh từ",
                },
              ],
            },
          ],
        },
      ],
    };
    const tasks = detectMissingData(form, langs);
    expect(tasks.some((t) => t.type === "generate-definition-translation")).toBe(false);
  });

  it("detects missing example translation per target language", () => {
    const langs = [{ lang_code: "vi", lang: "Vietnamese" }];
    const tasks = detectMissingData(BASE_WORD, langs);
    const exTrTasks = tasks.filter((t) => t.type === "generate-example-translation");
    expect(exTrTasks.length).toBeGreaterThan(0);
    expect(exTrTasks[0].id).toBe("ex-tr-0-0-vi");
    expect(exTrTasks[0].context.example).toBe("This is an example.");
  });

  it("skips example translation task when no example exists", () => {
    const langs = [{ lang_code: "vi", lang: "Vietnamese" }];
    const form: WordData = {
      ...BASE_WORD,
      meanings: [
        {
          ...BASE_WORD.meanings[0],
          definitions: [
            {
              text: "A representative form.",
              translations: [],
              // no example
            },
          ],
        },
      ],
    };
    const tasks = detectMissingData(form, langs);
    expect(tasks.some((t) => t.type === "generate-example-translation")).toBe(false);
  });
});
