const API_BASE = "/v1/admin";
const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY ?? "";

function adminHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Admin-Key": ADMIN_KEY,
  };
}

async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...adminHeaders(), ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error((err as { message?: string }).message ?? `API error ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export interface BulkGenerateJob {
  id: string;
  status: "idle" | "running" | "paused" | "completed" | "aborted" | "failed";
  taskTypes: string[];
  totalWords: number;
  processedCount: number;
  failedCount: number;
  lastProcessedId: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  config: {
    model: string;
    rpm_limit: number;
    concurrency: number;
    target_langs: { lang_code: string; lang: string }[];
  };
}

export interface AiFailure {
  id: string;
  job_id: string;
  word_id: string;
  word: string;
  task_type: string;
  error_message: string;
  attempted_at: string;
  retry_count: number;
}

export interface PaginatedFailures {
  failures: AiFailure[];
  total: number;
  page: number;
  limit: number;
}

export interface FailureQuery {
  jobId?: string;
  taskType?: string;
  word?: string;
  page?: number;
  limit?: number;
}

export function getBulkGenerateStatus(jobId?: string): Promise<BulkGenerateJob | null> {
  const params = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
  return adminFetch<BulkGenerateJob | null>(`/bulk-generate/status${params}`);
}

export function getAiFailures(params: FailureQuery): Promise<PaginatedFailures> {
  const qs = new URLSearchParams();
  if (params.jobId) qs.set("jobId", params.jobId);
  if (params.taskType) qs.set("taskType", params.taskType);
  if (params.word) qs.set("word", params.word);
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs.toString()}` : "";
  return adminFetch<PaginatedFailures>(`/ai-failures${query}`);
}

export function retryFailure(failureId: string): Promise<{ message: string }> {
  return adminFetch<{ message: string }>(`/ai-failures/${encodeURIComponent(failureId)}/retry`, {
    method: "POST",
  });
}

export function bulkRetryFailures(
  jobId: string,
): Promise<{ newJobId: string | null; failureCount: number; message: string }> {
  return adminFetch<{ newJobId: string | null; failureCount: number; message: string }>(
    "/ai-failures/bulk-retry",
    { method: "POST", body: JSON.stringify({ jobId }) },
  );
}
