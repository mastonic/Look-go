import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const defaultDir = process.env.VERCEL ? "/tmp/lookgo" : path.join(process.cwd(), "data");
const dataDir = process.env.LOOKGO_DATA_DIR || defaultDir;
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.LOOKGO_SQLITE_PATH || path.join(dataDir, "lookgo.db");
export const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  name TEXT,
  image TEXT,
  provider TEXT NOT NULL DEFAULT 'credentials',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  pseudo TEXT,
  height_cm INTEGER,
  weight_kg REAL,
  age INTEGER,
  hair_color TEXT,
  portrait_path TEXT,
  full_body_path TEXT,
  top_size TEXT,
  bottom_size TEXT,
  shoe_size TEXT,
  preferred_styles TEXT,
  preferred_colors TEXT,
  avoided_colors TEXT,
  preferred_brands TEXT,
  avoided_brands TEXT,
  outfit_budget INTEGER,
  budget_tier TEXT,
  onboarding_step INTEGER NOT NULL DEFAULT 1,
  onboarding_complete INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

export type DbUser = {
  id: number;
  email: string;
  password_hash: string | null;
  name: string | null;
  image: string | null;
  provider: string;
};

export function findUserByEmail(email: string) {
  return db.prepare("SELECT * FROM users WHERE lower(email)=lower(?)").get(email) as DbUser | undefined;
}

export function createEmailUser(email: string, passwordHash: string, name?: string) {
  const result = db.prepare("INSERT INTO users (email,password_hash,name,provider) VALUES (?,?,?,?)").run(email.toLowerCase(), passwordHash, name || null, "credentials");
  db.prepare("INSERT INTO profiles (user_id) VALUES (?)").run(result.lastInsertRowid);
  return Number(result.lastInsertRowid);
}

export function upsertOAuthUser(email: string, name?: string | null, image?: string | null) {
  const current = findUserByEmail(email);
  if (current) {
    db.prepare("UPDATE users SET name=COALESCE(?,name), image=COALESCE(?,image), updated_at=CURRENT_TIMESTAMP WHERE id=?").run(name || null, image || null, current.id);
    return current.id;
  }
  const result = db.prepare("INSERT INTO users (email,name,image,provider) VALUES (?,?,?,?)").run(email.toLowerCase(), name || null, image || null, "google");
  db.prepare("INSERT INTO profiles (user_id) VALUES (?)").run(result.lastInsertRowid);
  return Number(result.lastInsertRowid);
}

export function getProfileByUserId(userId: number) {
  return db.prepare("SELECT p.*, u.email, u.name, u.image, u.provider FROM profiles p JOIN users u ON u.id=p.user_id WHERE p.user_id=?").get(userId) as Record<string, unknown> | undefined;
}
