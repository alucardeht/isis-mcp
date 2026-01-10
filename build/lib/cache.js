import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
const CACHE_TTL = 3600000;
const CACHE_FILE = path.join(os.homedir(), '.isis-mcp-cache.db');
let db = null;
let SQL = null;
async function initDatabase() {
    if (!SQL) {
        SQL = await initSqlJs();
    }
    if (db)
        return db;
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const buffer = fs.readFileSync(CACHE_FILE);
            db = new SQL.Database(buffer);
        }
        else {
            db = new SQL.Database();
        }
    }
    catch {
        db = new SQL.Database();
    }
    db.run(`
    CREATE TABLE IF NOT EXISTS cache (
      url TEXT PRIMARY KEY,
      content TEXT,
      markdown TEXT,
      title TEXT,
      cached_at INTEGER
    )
  `);
    return db;
}
function saveDatabase() {
    if (!db)
        return;
    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(CACHE_FILE, buffer);
    }
    catch (error) {
        console.error('[isis-mcp] Cache save error:', error);
    }
}
let initialized = false;
async function ensureInitialized() {
    if (!initialized) {
        await initDatabase();
        initialized = true;
    }
}
export async function getFromCache(url) {
    await ensureInitialized();
    if (!db)
        return null;
    const now = Date.now();
    const result = db.exec('SELECT url, content, markdown, title, cached_at FROM cache WHERE url = ?', [url]);
    if (result.length === 0 || result[0].values.length === 0) {
        return null;
    }
    const row = result[0].values[0];
    const entry = {
        url: row[0],
        content: row[1],
        markdown: row[2],
        title: row[3],
        cached_at: row[4],
    };
    if (now - entry.cached_at > CACHE_TTL) {
        db.run('DELETE FROM cache WHERE url = ?', [url]);
        saveDatabase();
        return null;
    }
    return entry;
}
export async function saveToCache(url, data) {
    await ensureInitialized();
    if (!db)
        return;
    const now = Date.now();
    db.run('INSERT OR REPLACE INTO cache (url, content, markdown, title, cached_at) VALUES (?, ?, ?, ?, ?)', [url, data.content, data.markdown, data.title, now]);
    saveDatabase();
}
export function closeCache() {
    if (db) {
        saveDatabase();
        db.close();
        db = null;
    }
    initialized = false;
}
export function generateContentHandle(url) {
    return Buffer.from(url).toString('base64');
}
export function decodeContentHandle(handle) {
    try {
        return Buffer.from(handle, 'base64').toString('utf-8');
    }
    catch (error) {
        return null;
    }
}
//# sourceMappingURL=cache.js.map