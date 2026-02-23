import { useQuery } from "@pinia/colada";
import { fetchCategories } from "@/api/categories";

export function useCategoriesQuery() {
  return useQuery({
    key: ["categories"],
    query: fetchCategories,
  });
}
