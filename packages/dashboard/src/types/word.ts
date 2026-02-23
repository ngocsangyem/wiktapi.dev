import type { z } from "zod";
import type {
  wordPhoneticItemSchema,
  wordDefinitionSchema,
  wordTranslationItemSchema,
  wordMeaningSchema,
  wordTensesSchema,
  wordDataSchema,
} from "@/schemas/word";
import { WORD_CATEGORIES, type WordCategory } from "@/types/constants";

export type WordPhoneticItem = z.infer<typeof wordPhoneticItemSchema>;

export type WordDefinition = z.infer<typeof wordDefinitionSchema>;

export type WordTranslationItem = z.infer<typeof wordTranslationItemSchema>;

export type WordMeaning = z.infer<typeof wordMeaningSchema>;

export type WordTenses = z.infer<typeof wordTensesSchema>;

export type WordData = z.infer<typeof wordDataSchema>;

export type WordRecord = WordData & { id: string; createdAt: string };

export type WordListItem = {
  id: string;
  word: string;
  edition: string;
  category: string;
  phonetic: string | null;
};

export type WordsListResponse = {
  page: number;
  limit: number;
  total: number;
  words: WordListItem[];
};

export type SearchResponse = {
  results: { id: string; word: string; category: string; phonetic: string | null }[];
};

// Re-export from constants for backwards compatibility
export { WORD_CATEGORIES };
export type { WordCategory };
