import { computed, type Ref } from "vue";
import { useQuery } from "@pinia/colada";
import { getAiFailures, type FailureQuery } from "@/api/bulk-generate-api";

export function useAiFailuresQuery(params: Ref<FailureQuery>) {
  return useQuery({
    // Serialize params to primitives for cache key
    key: computed(
      () =>
        [
          "ai-failures",
          params.value.jobId ?? "",
          params.value.taskType ?? "",
          params.value.word ?? "",
          params.value.page ?? 1,
          params.value.limit ?? 50,
        ] as const,
    ),
    query: () => getAiFailures(params.value),
  });
}
