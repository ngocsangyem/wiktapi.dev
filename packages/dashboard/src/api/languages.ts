import { apiFetch } from "./client";

export type LanguagesResponse = { languages: string[] };

export function fetchLanguages(): Promise<LanguagesResponse> {
  return apiFetch<LanguagesResponse>("/languages");
}
