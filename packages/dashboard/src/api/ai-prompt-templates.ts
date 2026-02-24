import type { AiTask } from "@/composables/useAiTasks";

const SYSTEM_PROMPT =
  "You are a professional lexicographer. Return ONLY valid JSON with no markdown, no explanation. If a field is unavailable, use null.";

interface PromptMessages {
  system: string;
  user: string;
}

export function buildPrompt(task: AiTask): PromptMessages {
  const c = task.context;

  switch (task.type) {
    case "generate-ipa":
      return {
        system: SYSTEM_PROMPT,
        user: `Provide the IPA phonetic transcription for the English word "${c.word}". Return exactly: {"phonetic": "/.../"}\nExample for "example": {"phonetic": "/ɪɡˈzæmpəl/"}`,
      };

    case "generate-phonetic-us":
      return {
        system: SYSTEM_PROMPT,
        user: `Provide the ${c.type} English IPA pronunciation for the word "${c.word}". Return exactly: {"text": "/.../"}\nExample for "example" (US): {"text": "/ɪɡˈzæmpəl/"}`,
      };

    case "generate-phonetic-uk":
      return {
        system: SYSTEM_PROMPT,
        user: `Provide the ${c.type} English IPA pronunciation for the word "${c.word}". Return exactly: {"text": "/.../"}\nExample for "example" (UK): {"text": "/ɪɡˈzɑːmpəl/"}`,
      };

    case "generate-example":
      return {
        system: SYSTEM_PROMPT,
        user: `Write a natural example sentence for the word "${c.word}" used as ${c.partOfSpeech} with this definition: "${c.definition}". Return exactly: {"example": "..."}\nExample: {"example": "She gave an example of how to use the word correctly."}`,
      };

    case "generate-synonyms":
      return {
        system: SYSTEM_PROMPT,
        user: `List 3-5 synonyms for the word "${c.word}" when used as ${c.partOfSpeech}. Return exactly: {"synonyms": ["...", "..."]}\nExample: {"synonyms": ["illustration", "instance", "case", "specimen"]}`,
      };

    case "generate-antonyms":
      return {
        system: SYSTEM_PROMPT,
        user: `List 3-5 antonyms for the word "${c.word}" when used as ${c.partOfSpeech}. Return exactly: {"antonyms": ["...", "..."]}\nExample: {"antonyms": ["counterexample", "exception"]}`,
      };
  }
}
