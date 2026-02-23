import type { z } from "zod";
import type {
  wordPhoneticItemSchema,
  wordDefinitionSchema,
  wordTranslationItemSchema,
  wordMeaningSchema,
  wordTensesSchema,
  wordDataSchema,
} from "@/schemas/word";

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
  phonetic: string | null;
};

export type WordsListResponse = {
  page: number;
  limit: number;
  total: number;
  words: WordListItem[];
};

export type SearchResponse = {
  results: { id: string; word: string; phonetic: string | null }[];
};
