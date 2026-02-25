import { defineHandler, getQuery } from "nitro/h3";
import { db } from "../../../../utils/db";

interface JobRow {
  id: string;
  status: string;
  task_types: string;
  total_words: number;
  processed_count: number;
  failed_count: number;
  last_processed_id: string | null;
  started_at: string | null;
  updated_at: string | null;
  config: string;
}

/** GET /v1/admin/bulk-generate/status?jobId=<optional> — returns latest or specific job progress. */
export default defineHandler((event) => {
  const { jobId } = getQuery(event) as { jobId?: string };

  const row = jobId
    ? (db.prepare("SELECT * FROM ai_generation_jobs WHERE id = ?").get(jobId) as JobRow | undefined)
    : (db.prepare("SELECT * FROM ai_generation_jobs ORDER BY started_at DESC LIMIT 1").get() as
        | JobRow
        | undefined);

  if (!row) return null;

  return {
    id: row.id,
    status: row.status,
    taskTypes: JSON.parse(row.task_types) as string[],
    totalWords: row.total_words,
    processedCount: row.processed_count,
    failedCount: row.failed_count,
    lastProcessedId: row.last_processed_id,
    startedAt: row.started_at,
    updatedAt: row.updated_at,
    config: JSON.parse(row.config) as Record<string, unknown>,
  };
});
