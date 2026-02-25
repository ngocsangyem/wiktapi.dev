import { defineHandler, readBody, createError } from "nitro/h3";
import { db, dbWrite } from "../../../../utils/db";

interface BulkRetryBody {
  jobId: string;
}

interface JobRow {
  id: string;
  config: string;
  task_types: string;
}

/**
 * POST /v1/admin/ai-failures/bulk-retry
 * Body: { jobId: string }
 *
 * Creates a new ai_generation_jobs row targeting only the failed words from the
 * given job. The caller then runs the CLI with --job-id <newJobId> to process it.
 * Returns { newJobId } so the dashboard can track the retry job.
 */
export default defineHandler(async (event) => {
  const body = (await readBody(event)) as BulkRetryBody;
  if (!body?.jobId) throw createError({ statusCode: 400, message: "jobId is required" });

  const originalJob = db.prepare("SELECT * FROM ai_generation_jobs WHERE id = ?").get(body.jobId) as
    | JobRow
    | undefined;

  if (!originalJob) throw createError({ statusCode: 404, message: "Job not found" });

  const { total } = db
    .prepare("SELECT COUNT(*) AS total FROM ai_failures WHERE job_id = ?")
    .get(body.jobId) as { total: number };

  if (total === 0) return { message: "No failures to retry", newJobId: null };

  const newJobId = crypto.randomUUID();
  const now = new Date().toISOString();

  dbWrite
    .prepare(`
      INSERT INTO ai_generation_jobs
        (id, status, task_types, total_words, processed_count, failed_count, last_processed_id, started_at, updated_at, config)
      VALUES (?, 'idle', ?, ?, 0, 0, NULL, ?, ?, ?)
    `)
    .run(newJobId, originalJob.task_types, total, now, now, originalJob.config);

  return {
    newJobId,
    failureCount: total,
    message: `Created retry job ${newJobId} for ${total} failures. Run: pnpm --filter @wordictapi/api bulk-generate --job-id ${newJobId}`,
  };
});
