import { defineHandler, getQuery } from "nitro/h3";
import { db } from "../../../../utils/db";

interface FailureRow {
  id: string;
  job_id: string;
  word_id: string;
  word: string;
  task_type: string;
  error_message: string;
  attempted_at: string;
  retry_count: number;
}

/**
 * GET /v1/admin/ai-failures
 * Query params: jobId, taskType, word (search), page (1-based), limit (default 50)
 */
export default defineHandler((event) => {
  const query = getQuery(event) as {
    jobId?: string;
    taskType?: string;
    word?: string;
    page?: string;
    limit?: string;
  };

  const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(query.limit ?? "50", 10) || 50));
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (query.jobId) {
    conditions.push("job_id = ?");
    params.push(query.jobId);
  }
  if (query.taskType) {
    conditions.push("task_type = ?");
    params.push(query.taskType);
  }
  if (query.word) {
    conditions.push("word LIKE ?");
    params.push(`%${query.word}%`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const failures = db
    .prepare(`SELECT * FROM ai_failures ${where} ORDER BY attempted_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as FailureRow[];

  const { total } = db
    .prepare(`SELECT COUNT(*) AS total FROM ai_failures ${where}`)
    .get(...params) as { total: number };

  return { failures, total, page, limit };
});
