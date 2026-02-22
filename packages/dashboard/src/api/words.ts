import { apiFetch } from "./client";
import type { WordData, WordRecord, WordsListResponse, SearchResponse } from "@/types/word";

export function fetchWords(params: {
  page?: number;
  limit?: number;
  category?: string;
  edition?: string;
  signal?: AbortSignal;
}): Promise<WordsListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.category) qs.set("category", params.category);
  if (params.edition) qs.set("edition", params.edition);
  return apiFetch(`/words?${qs}`, { signal: params.signal });
}

export function searchWords(q: string, category?: string): Promise<SearchResponse> {
  const qs = new URLSearchParams({ q });
  if (category) qs.set("category", category);
  return apiFetch(`/search?${qs}`);
}

export function fetchWord(word: string, category?: string): Promise<WordRecord> {
  const qs = category ? `?category=${encodeURIComponent(category)}` : "";
  return apiFetch(`/word/${encodeURIComponent(word)}${qs}`);
}

export function createWord(data: WordData): Promise<WordRecord> {
  return apiFetch("/word", { method: "POST", body: JSON.stringify(data) });
}

export function updateWord(word: string, data: WordData): Promise<WordRecord> {
  return apiFetch(`/word/${encodeURIComponent(word)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteWord(word: string, edition?: string, category?: string): Promise<void> {
  const qs = new URLSearchParams();
  if (edition) qs.set("edition", edition);
  if (category) qs.set("category", category);
  const query = qs.toString() ? `?${qs}` : "";
  return apiFetch(`/word/${encodeURIComponent(word)}${query}`, { method: "DELETE" });
}

export function bulkDeleteWords(words: string[]): Promise<void> {
  return apiFetch("/words/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ words }),
  });
}
