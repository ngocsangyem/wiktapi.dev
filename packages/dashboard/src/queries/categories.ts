import { useQuery } from "@pinia/colada";
import { apiFetch } from "@/api/client";

export function useCategoriesQuery() {
  return useQuery({
    key: ["categories"],
    query: () => apiFetch<{ categories: string[] }>("/categories"),
  });
}
