import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || '/data/coldshowers.db';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    INTEGER NOT NULL,

    -- NULL = no explicit preference, fall back to the browser's
    -- Accept-Language on every request (see lib/i18n.js).
    locale TEXT,

    -- The duration goal shown on the dashboard and used by the "log target
    -- duration" quick button. Stored in seconds for simplicity.
    target_duration_seconds INTEGER NOT NULL DEFAULT 120,

    -- Daily reminder. "reminder_time" is a plain 'HH:MM' string compared
    -- against the server's local wall-clock time (see compose.yaml's
    -- TZ=Europe/Amsterdam) -- intentionally not a full cron expression,
    -- this only ever needs to fire once a day at a fixed time.
    reminder_enabled    INTEGER NOT NULL DEFAULT 0,
    reminder_time       TEXT NOT NULL DEFAULT '07:00',
    last_reminded_date  TEXT, -- 'YYYY-MM-DD', prevents a second reminder the same day

    -- BYOK notification channel -- this project is meant to be shared on
    -- GitHub, so it can never hardcode a specific ntfy/Telegram deployment.
    -- Each user plugs in their own credentials, exactly like ReadRepeat's
    -- AI-provider keys. 'none' | 'ntfy' | 'telegram'.
    reminder_method   TEXT NOT NULL DEFAULT 'none',
    ntfy_base_url     TEXT NOT NULL DEFAULT 'https://ntfy.sh',
    ntfy_topic        TEXT,
    ntfy_token        TEXT,
    telegram_bot_token TEXT,
    telegram_chat_id   TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
    sid        TEXT PRIMARY KEY,
    data       TEXT NOT NULL,
    expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- Not multi-user-scoped on purpose: this is a single-user app (one account
-- per installation, same model as ReadRepeat), so showers just belong to
-- the installation as a whole rather than repeating a user_id on every row.
CREATE TABLE IF NOT EXISTS showers (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at       INTEGER NOT NULL, -- epoch ms, when the shower was logged
    duration_seconds INTEGER NOT NULL,
    -- Snapshot of the target AT THE TIME of logging, so a later change to
    -- the target doesn't retroactively change what old chart entries meant.
    target_seconds   INTEGER NOT NULL,
    created_at       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_showers_started ON showers(started_at);
`);

export function userCount() {
    return db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
}
