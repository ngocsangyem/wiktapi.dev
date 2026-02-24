export interface PhoneticItem {
  text: string;
  type: "uk" | "us";
  audioUrl?: string | null;
}

export interface ExampleItem {
  text: string;
  translations: TranslationItem[];
}

export interface Definition {
  text: string;
  example?: ExampleItem;
  translations: TranslationItem[];
}

export interface TranslationItem {
  partOfSpeech: string;
  lang_code: string;
  code: string;
  lang: string;
  word: string;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  synonyms?: string[];
  antonyms?: string[];
}

export interface Tenses {
  base: string;
  past: string;
  present: string;
  future?: string;
  singular: string;
  plural: string;
}

export interface ConfusableWord {
  word: string;
  meanings: Meaning[];
}

export interface WordData {
  word: string;
  edition: string;
  phonetic: string | null;
  phonetics: PhoneticItem[];
  meanings: Meaning[];
  translations: TranslationItem[];
  tenses?: Tenses;
  // confusable?: ConfusableWord[];  // reserved for future use
}

export interface WordRecord extends WordData {
  id: string;
  createdAt: string;
}

// Internal DB row types — not part of public API contract

export interface WordRow {
  id: string;
  word: string;
  edition: string;
  phonetic: string | null;
  phonetics: string; // JSON: PhoneticItem[]
  translations: string; // JSON: TranslationItem[] (word-level aggregate)
  tenses: string | null; // JSON: Tenses | null
  createdAt: string;
}

export interface MeaningRow {
  id: string;
  word_id: string;
  partOfSpeech: string;
  definitions: string; // JSON: Definition[]
  synonyms: string | null;
  antonyms: string | null;
  sort_order: number;
}
