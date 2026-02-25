/**
 * Prompt builders for bulk AI generation.
 * Ported from packages/dashboard/src/api/ai-prompt-templates.ts — no Vue deps.
 */

export type AiTaskType =
  | "generate-ipa"
  | "generate-phonetic-us"
  | "generate-phonetic-uk"
  | "generate-example"
  | "generate-synonyms"
  | "generate-antonyms"
  | "generate-tenses"
  | "generate-translation"
  | "generate-definition-translation"
  | "generate-example-translation";

export const ALL_TASK_TYPES: AiTaskType[] = [
  "generate-ipa",
  "generate-phonetic-us",
  "generate-phonetic-uk",
  "generate-example",
  "generate-synonyms",
  "generate-antonyms",
  "generate-tenses",
  "generate-translation",
  "generate-definition-translation",
  "generate-example-translation",
];

export interface AiTask {
  id: string;
  type: AiTaskType;
  context: Record<string, string>;
  /** Meaning index (for meaning-scoped tasks) */
  mi?: number;
  /** Definition index (for definition-scoped tasks) */
  di?: number;
}

interface PromptMessages {
  system: string;
  user: string;
}

const SYSTEM_PROMPT =
  "You are a professional lexicographer. Return ONLY valid JSON with no markdown, no explanation. If a field is unavailable, use null.";

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
        user: `Generate all tenses and grammatical forms for the English word "${c.word}".${existingNote}
Return exactly this JSON structure:
{"base_form": "...", "past_simple": "...", "past_participle": "...", "present_simple": {"singular": "...", "plural": "..."}, "present_participle": "...", "future": "..."}
Fields:
- base_form: base/infinitive form (e.g. "run")
- past_simple: simple past (e.g. "ran")
- past_participle: past participle (e.g. "run")
- present_simple.singular: 3rd person singular present (e.g. "runs")
- present_simple.plural: base plural present (e.g. "run")
- present_participle: present participle / -ing form (e.g. "running")
- future: future tense (e.g. "will run"; use null if not applicable)
Example for "run": {"base_form": "run", "past_simple": "ran", "past_participle": "run", "present_simple": {"singular": "runs", "plural": "run"}, "present_participle": "running", "future": "will run"}`,
      };
    }

    case "generate-translation": {
      const posNote = c.partOfSpeech ? ` (${c.partOfSpeech})` : "";
      return {
        system: SYSTEM_PROMPT,
        user: `Translate the English word "${c.word}"${posNote} into ${c.targetLang}. Return exactly: {"lang_code": "${c.targetLangCode}", "code": "${c.targetLangCode}", "lang": "${c.targetLang}", "word": "...", "partOfSpeech": "..."}\nFill "word" with the ${c.targetLang} translation and "partOfSpeech" with the ${c.targetLang} part of speech label.\nExample for "example" -> Vietnamese: {"lang_code": "vi", "code": "vi", "lang": "Vietnamese", "word": "ví dụ", "partOfSpeech": "danh từ"}`,
      };
    }

    case "generate-definition-translation": {
      return {
        system: SYSTEM_PROMPT,
        user: `Translate this English definition of "${c.word}" (${c.partOfSpeech}) into ${c.targetLang}: "${c.definition}"
Return exactly: {"lang_code": "${c.targetLangCode}", "code": "${c.targetLangCode}", "lang": "${c.targetLang}", "word": "...", "partOfSpeech": "..."}
Fill "word" with the ${c.targetLang} translation of the definition text. Fill "partOfSpeech" with the ${c.targetLang} part of speech label.`,
      };
    }

    case "generate-example-translation": {
      return {
        system: SYSTEM_PROMPT,
        user: `Translate this English example sentence into ${c.targetLang}: "${c.example}"
Return exactly: {"lang_code": "${c.targetLangCode}", "code": "${c.targetLangCode}", "lang": "${c.targetLang}", "word": "...", "partOfSpeech": "..."}
Fill "word" with the ${c.targetLang} translation of the sentence. Fill "partOfSpeech" with the ${c.targetLang} part of speech label.`,
      };
    }
  }
}
