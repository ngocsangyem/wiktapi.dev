import { apiFetch } from "./client";
import type { WordData, WordRecord, WordsListResponse, SearchResponse } from "@/types/word";

export function fetchWords(params: {
  page?: number;
  limit?: number;
  edition?: string;
  signal?: AbortSignal;
}): Promise<WordsListResponse> {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.edition) qs.set("edition", params.edition);
  return apiFetch(`/words?${qs}`, { signal: params.signal });
}

export function searchWords(q: string, useRegex?: boolean): Promise<SearchResponse> {
  const params = new URLSearchParams();
  params.set("q", q);
  if (useRegex) params.set("regex", "true");
  return apiFetch(`/search?${params.toString()}`);
}

export function fetchWord(word: string): Promise<WordRecord> {
  return apiFetch(`/word/${encodeURIComponent(word)}`);
}

export function fetchWordById(id: string): Promise<WordRecord> {
  return apiFetch(`/word/${encodeURIComponent(id)}`);
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

export function updateWordById(id: string, data: WordData): Promise<WordRecord> {
  return apiFetch(`/word/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function deleteWord(id: string, edition?: string): Promise<void> {
  const qs = new URLSearchParams();
  if (edition) qs.set("edition", edition);
  const query = qs.toString() ? `?${qs}` : "";
  return apiFetch(`/word/${encodeURIComponent(id)}${query}`, { method: "DELETE" });
}

export function bulkDeleteWords(words: string[]): Promise<void> {
  return apiFetch("/words/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ words }),
  });
}
