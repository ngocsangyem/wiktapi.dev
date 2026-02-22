import { useQuery } from "@pinia/colada";
import { apiFetch } from "@/api/client";

export function useLanguagesQuery() {
  return useQuery({
    key: ["languages"],
    query: () => apiFetch<{ languages: string[] }>("/languages"),
  });
}
