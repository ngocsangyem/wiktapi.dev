import { useQuery } from "@pinia/colada";
import { fetchLanguages } from "@/api/languages";

export function useLanguagesQuery() {
  return useQuery({
    key: ["languages"],
    query: fetchLanguages,
  });
}
