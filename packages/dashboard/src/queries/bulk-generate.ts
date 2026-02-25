import { computed, type Ref } from "vue";
import { useQuery } from "@pinia/colada";
import { getBulkGenerateStatus } from "@/api/bulk-generate-api";

export function useBulkGenerateStatusQuery(jobId?: Ref<string | null>) {
  return useQuery({
    key: computed(() => ["bulk-generate-status", jobId?.value ?? ""] as const),
    query: () => getBulkGenerateStatus(jobId?.value ?? undefined),
  });
}
