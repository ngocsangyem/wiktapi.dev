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
        user: `Provide the US English IPA pronunciation for the word "${c.word}". Return exactly the phonetic entry object: {"type": "us", "text": "/.../"}\nExample for "example": {"type": "us", "text": "/ɪɡˈzæmpəl/"}`,
      };

    case "generate-phonetic-uk":
      return {
        system: SYSTEM_PROMPT,
        user: `Provide the UK English IPA pronunciation for the word "${c.word}". Return exactly the phonetic entry object: {"type": "uk", "text": "/.../"}\nExample for "example": {"type": "uk", "text": "/ɪɡˈzɑːmpəl/"}`,
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

    case "generate-tenses": {
      const existingNote = c.existing
        ? `\nExisting values (keep them, only fill missing fields): ${c.existing}`
        : "";
      return {
        system: SYSTEM_PROMPT,
        user: `Generate all tenses and grammatical forms for the word "${c.word}".${existingNote}
Return exactly the WordTenses object:
{"base": "...", "past": "...", "present": "...", "future": "...", "singular": "...", "plural": "..."}
Fields:
- base: base/infinitive form (e.g. "run", "child")
- past: simple past (e.g. "ran"; for nouns repeat base)
- present: 3rd person singular present (e.g. "runs"; for nouns repeat singular)
- future: future tense (e.g. "will run"; use null if not applicable)
- singular: singular form (e.g. "run", "child")
- plural: plural form (e.g. "runs", "children")
Example for "run": {"base": "run", "past": "ran", "present": "runs", "future": "will run", "singular": "run", "plural": "runs"}`,
      };
    }
  }
}
