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
  translations: TranslationItem[];
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
  edition: string;
  phonetic: string | null;
  phonetics: PhoneticItem[];
  meanings: Meaning[];
  category: WordCategory;
  translations: TranslationItem[];
  tenses?: Tenses;
}

export interface WordRecord extends WordData {
  id: string;
  createdAt: string;
}

export interface WordListItem {
  id: string;
  word: string;
  edition: string;
  category: string;
  phonetic: string | null;
}

export interface WordsListResponse {
  page: number;
  limit: number;
  total: number;
  words: WordListItem[];
}

export interface SearchResponse {
  results: { id: string; word: string; category: string; phonetic: string | null }[];
}
