import { describe, expect, it } from "vite-plus/test";
import { buildPrompt } from "./ai-prompt-templates";
import type { AiTask } from "@/composables/useAiTasks";

function makeTask(type: AiTask["type"], overrides: Partial<AiTask> = {}): AiTask {
  return {
    id: "test",
    type,
    label: "Test",
    context: { word: "run", partOfSpeech: "verb", definition: "To move quickly.", type: "US" },
    status: "idle",
    ...overrides,
  };
}

describe("buildPrompt", () => {
  it("generate-ipa includes word in user prompt and returns JSON schema", () => {
    const { user, system } = buildPrompt(makeTask("generate-ipa"));
    expect(user).toContain("run");
    expect(user).toContain('"phonetic"');
    expect(system).toContain("JSON");
  });

  it("generate-phonetic-us includes word and US type", () => {
    const { user } = buildPrompt(makeTask("generate-phonetic-us"));
    expect(user).toContain("run");
    expect(user).toContain('"text"');
  });

  it("generate-phonetic-uk includes word and UK type", () => {
    const { user } = buildPrompt(
      makeTask("generate-phonetic-uk", {
        context: { word: "run", type: "UK", partOfSpeech: "verb", definition: "" },
      }),
    );
    expect(user).toContain("run");
    expect(user).toContain('"text"');
  });

  it("generate-example includes word, partOfSpeech, and definition", () => {
    const { user } = buildPrompt(makeTask("generate-example"));
    expect(user).toContain("run");
    expect(user).toContain("verb");
    expect(user).toContain("To move quickly.");
    expect(user).toContain('"example"');
  });

  it("generate-synonyms includes word and partOfSpeech", () => {
    const { user } = buildPrompt(makeTask("generate-synonyms"));
    expect(user).toContain("run");
    expect(user).toContain("verb");
    expect(user).toContain('"synonyms"');
  });

  it("generate-antonyms includes word and partOfSpeech", () => {
    const { user } = buildPrompt(makeTask("generate-antonyms"));
    expect(user).toContain("run");
    expect(user).toContain("verb");
    expect(user).toContain('"antonyms"');
  });

  it("all prompts have a system and user message", () => {
    const types: AiTask["type"][] = [
      "generate-ipa",
      "generate-phonetic-us",
      "generate-phonetic-uk",
      "generate-example",
      "generate-synonyms",
      "generate-antonyms",
    ];
    for (const type of types) {
      const { system, user } = buildPrompt(makeTask(type));
      expect(system.length).toBeGreaterThan(0);
      expect(user.length).toBeGreaterThan(0);
    }
  });
});
