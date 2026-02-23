import { apiFetch } from "./client";

export type CategoriesResponse = { categories: string[] };

export function fetchCategories(): Promise<CategoriesResponse> {
  return apiFetch<CategoriesResponse>("/categories");
}
