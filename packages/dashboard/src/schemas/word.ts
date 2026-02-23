import { z } from "zod";

const phoneticItemSchema = z.object({
  text: z.string().min(1, "Phonetic text is required"),
  type: z.enum(["uk", "us"]),
  audioUrl: z.string().url().nullable().optional(),
});

export const wordPhoneticItemSchema = phoneticItemSchema;

const definitionSchema = z.object({
  definition: z.string().min(1, "Definition is required"),
  example: z.string().optional(),
  definitionTranslate: z.string().optional(),
});

export const wordDefinitionSchema = definitionSchema;

const translationItemSchema = z.object({
  partOfSpeech: z.string().min(1, "Part of speech is required"),
  lang_code: z.string().min(1),
  code: z.string().min(1),
  lang: z.string().min(1),
  word: z.string().min(1),
});

export const wordTranslationItemSchema = translationItemSchema;

const meaningSchema = z.object({
  partOfSpeech: z.string().min(1, "Part of speech is required"),
  definitions: z.array(definitionSchema).min(1, "At least one definition is required"),
  translations: z.array(translationItemSchema),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
});

export const wordMeaningSchema = meaningSchema;

const tensesSchema = z.object({
  base: z.string().min(1),
  past: z.string().min(1),
  present: z.string().min(1),
  future: z.string().optional(),
  singular: z.string().min(1),
  plural: z.string().min(1),
});

export const wordTensesSchema = tensesSchema;

export const wordDataSchema = z.object({
  word: z.string().min(1, "Word is required"),
  edition: z.string().min(1, "Edition is required"),
  phonetic: z.string().nullable(),
  phonetics: z.array(phoneticItemSchema),
  meanings: z.array(meaningSchema).min(1, "At least one meaning is required"),
  translations: z.array(translationItemSchema),
  tenses: tensesSchema.optional(),
});

export type WordFormData = z.infer<typeof wordDataSchema>;
