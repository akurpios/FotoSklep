import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_PATH = path.join(DATA_DIR, 'proofing.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export { DATA_DIR, UPLOADS_DIR };

export const db = new Database(DB_PATH);

// Initialize schema
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    pin TEXT NOT NULL,
    included_photos INTEGER NOT NULL DEFAULT 10,
    extra_photo_price REAL NOT NULL DEFAULT 40.0,
    currency TEXT NOT NULL DEFAULT 'PLN',
    status TEXT NOT NULL DEFAULT 'Draft',
    watermark_enabled INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    confirmed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    url TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT NOT NULL,
    selected INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES ('public_domain', 'https://fotosklep.kurpios.art');
  INSERT OR IGNORE INTO settings (key, value) VALUES ('watermark_url', '');

  CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);
  CREATE INDEX IF NOT EXISTS idx_photos_project ON photos(project_id);
`);

// Migration for existing databases
try {
  const tableInfo = db.prepare("PRAGMA table_info('projects')").all() as { name: string }[];
  const hasWatermark = tableInfo.some((col) => col.name === 'watermark_enabled');
  if (!hasWatermark) {
    db.prepare('ALTER TABLE projects ADD COLUMN watermark_enabled INTEGER NOT NULL DEFAULT 1').run();
  }
} catch (e) {
  console.warn('[DB Migration] Note on watermark_enabled column:', e);
}

