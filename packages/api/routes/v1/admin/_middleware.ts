import { defineEventHandler, getHeader, createError } from "nitro/h3";

/** Guards all /v1/admin/* routes with X-Admin-Key header auth. */
export default defineEventHandler((event) => {
  const key = getHeader(event, "x-admin-key");
  const expected = process.env.ADMIN_API_KEY;
  if (!expected || key !== expected) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
});
