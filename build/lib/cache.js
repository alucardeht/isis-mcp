import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
const CACHE_TTL = 3600000;
const CACHE_FILE = path.join(os.homedir(), '.isis-mcp-cache.db');
const MEMORY_CACHE_MAX = 100;
const DISK_WRITE_DEBOUNCE = 5000;
let db = null;
let SQL = null;
let memoryCache = new Map();
let diskWriteTimeout = null;
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
function evictOldestFromMemory() {
    if (memoryCache.size < MEMORY_CACHE_MAX)
        return;
    let oldest = null;
    let oldestTime = Infinity;
    for (const [url, entry] of memoryCache) {
        if (entry.lastAccess < oldestTime) {
            oldestTime = entry.lastAccess;
            oldest = url;
        }
    }
    if (oldest) {
        memoryCache.delete(oldest);
    }
}
async function saveDatabaseAsync() {
    if (!db)
        return;
    try {
        const data = db.export();
        const buffer = Buffer.from(data);
        await fs.promises.writeFile(CACHE_FILE, buffer);
    }
    catch (error) {
        console.error('[isis-mcp] Cache async save error:', error);
    }
}
function scheduleDiskWrite() {
    if (diskWriteTimeout)
        return;
    diskWriteTimeout = setTimeout(async () => {
        diskWriteTimeout = null;
        await saveDatabaseAsync();
    }, DISK_WRITE_DEBOUNCE);
}
function saveDatabase() {
    scheduleDiskWrite();
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
    const memHit = memoryCache.get(url);
    if (memHit && now - memHit.cached_at <= CACHE_TTL) {
        memHit.lastAccess = now;
        return {
            url: memHit.url,
            content: memHit.content,
            markdown: memHit.markdown,
            title: memHit.title,
            cached_at: memHit.cached_at,
        };
    }
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
    memoryCache.set(url, {
        ...entry,
        lastAccess: now,
    });
    evictOldestFromMemory();
    return entry;
}
export async function saveToCache(url, data) {
    await ensureInitialized();
    if (!db)
        return;
    const now = Date.now();
    memoryCache.set(url, {
        url,
        content: data.content,
        markdown: data.markdown,
        title: data.title,
        cached_at: now,
        lastAccess: now,
    });
    evictOldestFromMemory();
    db.run('INSERT OR REPLACE INTO cache (url, content, markdown, title, cached_at) VALUES (?, ?, ?, ?, ?)', [url, data.content, data.markdown, data.title, now]);
    saveDatabase();
}
export async function closeCache() {
    if (diskWriteTimeout) {
        clearTimeout(diskWriteTimeout);
        diskWriteTimeout = null;
    }
    await saveDatabaseAsync();
    if (db) {
        db.close();
        db = null;
    }
    memoryCache.clear();
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