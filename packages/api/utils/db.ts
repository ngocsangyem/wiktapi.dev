import Database from "better-sqlite3";
import { resolve } from "node:path";
import type { Database as BetterSqliteDB } from "better-sqlite3";

const dbPath = process.env.DATA_PATH ?? resolve("./data/wiktionary.db");

console.log(`Opening database at ${dbPath}...`);

export const db: BetterSqliteDB = new Database(dbPath, { readonly: true });

// Necessary pragma settings for performance; these are safe for read-only access on a server with at least 2GB of RAM
db.pragma("cache_size = -32000"); // 32MB internal cache
db.pragma("mmap_size = 268435456"); // 256MB memory-mapped I/O (safe for 2GB server)

// WARNING: No authentication on write operations. For local/trusted use only.
// Do NOT expose write routes in production without adding auth middleware.
export const dbWrite: BetterSqliteDB = new Database(dbPath);
dbWrite.pragma("journal_mode = WAL"); // safe concurrent reads + writes
dbWrite.pragma("busy_timeout = 5000");
dbWrite.pragma("foreign_keys = ON");

db.pragma("foreign_keys = ON");
