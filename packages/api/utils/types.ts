export interface PhoneticItem {
  text: string;
  type: "uk" | "us";
  audioUrl?: string | null;
}

export interface Definition {
  definition: string;
  example?: string;
  definitionTranslate?: string;
}

export interface Meaning {
  partOfSpeech: string;
  definitions: Definition[];
  translate: string | null;
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

export type WordCategory =
  | "technology"
  | "business"
  | "travel"
  | "music"
  | "movies"
  | "sports"
  | "food"
  | "art"
  | "science"
  | "health"
  | "fashion"
  | "gaming"
  | "books"
  | "nature"
  | "photography"
  | "education"
  | "history"
  | "politics"
  | "automotive"
  | "pets"
  | "general";

export const WORD_CATEGORIES: readonly WordCategory[] = [
  "technology",
  "business",
  "travel",
  "music",
  "movies",
  "sports",
  "food",
  "art",
  "science",
  "health",
  "fashion",
  "gaming",
  "books",
  "nature",
  "photography",
  "education",
  "history",
  "politics",
  "automotive",
  "pets",
  "general",
] as const;

export interface WordData {
  word: string;
  phonetic: string | null;
  phonetics: PhoneticItem[];
  meanings: Meaning[];
  category: WordCategory;
  translate: string | null;
  tenses?: Tenses;
  // confusable?: ConfusableWord[];  // reserved for future use
}

export interface WordRecord extends WordData {
  id: string;
  createdAt: string;
}
