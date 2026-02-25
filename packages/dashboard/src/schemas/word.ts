import { z } from "zod";

const phoneticItemSchema = z.object({
  text: z.string().min(1, "Phonetic text is required"),
  type: z.enum(["uk", "us"]),
  audioUrl: z.string().url().nullable().optional(),
});

export const wordPhoneticItemSchema = phoneticItemSchema;

const translationItemSchema = z.object({
  partOfSpeech: z.string().min(1, "Part of speech is required"),
  lang_code: z.string().min(1),
  code: z.string().min(1),
  lang: z.string().min(1),
  word: z.string().min(1),
});

export const wordTranslationItemSchema = translationItemSchema;

const exampleItemSchema = z.object({
  text: z.string().min(1, "Example text is required"),
  translations: z.array(translationItemSchema),
});

export const wordExampleItemSchema = exampleItemSchema;

const definitionSchema = z.object({
  text: z.string().min(1, "Definition is required"),
  example: exampleItemSchema.optional(),
  translations: z.array(translationItemSchema),
});

export const wordDefinitionSchema = definitionSchema;

const meaningSchema = z.object({
  partOfSpeech: z.string().min(1, "Part of speech is required"),
  definitions: z.array(definitionSchema).min(1, "At least one definition is required"),
  synonyms: z.array(z.string()).optional(),
  antonyms: z.array(z.string()).optional(),
});

export const wordMeaningSchema = meaningSchema;

const presentSimpleSchema = z.object({
  singular: z.string().nullable(),
  plural: z.string().nullable(),
});

const tensesSchema = z.object({
  base_form: z.string().nullable(),
  past_simple: z.string().nullable(),
  past_participle: z.string().nullable(),
  present_simple: presentSimpleSchema,
  present_participle: z.string().nullable(),
  future: z.string().nullable(),
});

export const wordTensesSchema = tensesSchema;

export const wordDataSchema = z.object({
  word: z.string().min(1, "Word is required"),
  edition: z.string().min(1, "Edition is required"),
  phonetic: z.string().nullable(),
  phonetics: z.array(phoneticItemSchema),
  meanings: z.array(meaningSchema).min(1, "At least one meaning is required"),
  translations: z.array(translationItemSchema),
  tenses: tensesSchema.nullable(),
});

export type WordFormData = z.infer<typeof wordDataSchema>;
