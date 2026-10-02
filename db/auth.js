import crypto from 'crypto';
import { db } from './index.js';

// scrypt (Node built-in, no extra dependency) -- salted, per-user.
export function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(':');
    const check = crypto.scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return check.length === expected.length && crypto.timingSafeEqual(check, expected);
}

export function setPassword(userId, password) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), userId);
}

export function createUser(username, password) {
    const now = Date.now();
    const info = db
        .prepare('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)')
        .run(username, hashPassword(password), now);
    return info.lastInsertRowid;
}

export function findUserByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
}

export function findUserById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

export function setUserLocale(userId, locale) {
    db.prepare('UPDATE users SET locale = ? WHERE id = ?').run(locale || null, userId);
}
