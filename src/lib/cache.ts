import Database from "better-sqlite3";
import { homedir } from "os";
import { join } from "path";

interface CacheEntry {
  url: string;
  content: string;
  markdown: string;
  title: string;
  cached_at: number;
}

const CACHE_TTL = 3600000;

let db: Database.Database | null = null;

function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = join(homedir(), ".isis-mcp-cache.db");
    db = new Database(dbPath);

    db.exec(`
      CREATE TABLE IF NOT EXISTS cache (
        url TEXT PRIMARY KEY,
        content TEXT,
        markdown TEXT,
        title TEXT,
        cached_at INTEGER
      )
    `);
  }
  return db;
}

export function getFromCache(url: string): CacheEntry | null {
  const database = getDatabase();
  const row = database
    .prepare("SELECT * FROM cache WHERE url = ?")
    .get(url) as CacheEntry | undefined;

  if (!row) return null;

  if (Date.now() - row.cached_at > CACHE_TTL) {
    database.prepare("DELETE FROM cache WHERE url = ?").run(url);
    return null;
  }

  return row;
}

export function saveToCache(
  url: string,
  data: { content: string; markdown: string; title: string }
): void {
  const database = getDatabase();
  database
    .prepare(
      "INSERT OR REPLACE INTO cache (url, content, markdown, title, cached_at) VALUES (?, ?, ?, ?, ?)"
    )
    .run(url, data.content, data.markdown, data.title, Date.now());
}

export function closeCache(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function generateContentHandle(url: string): string {
  return Buffer.from(url).toString('base64');
}

export function decodeContentHandle(handle: string): string | null {
  try {
    return Buffer.from(handle, 'base64').toString('utf-8');
  } catch (error) {
    return null;
  }
}
