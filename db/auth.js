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

export function findUserByOidc(issuer, sub) {
    return db.prepare('SELECT * FROM users WHERE oidc_issuer = ? AND oidc_sub = ?').get(issuer, sub);
}

// Only used with OIDC_LINK_BY_USERNAME=true: exact (case-sensitive) match, and only an
// account that isn't linked to any SSO identity yet.
export function findUnlinkedUserByUsername(username) {
    return db.prepare('SELECT * FROM users WHERE username = ? AND oidc_sub IS NULL').get(username);
}

export function anyUserLinkedToOidc(issuer) {
    return Boolean(db.prepare('SELECT 1 FROM users WHERE oidc_issuer = ? AND oidc_sub IS NOT NULL LIMIT 1').get(issuer));
}

export function linkUserOidc(userId, issuer, sub) {
    db.prepare('UPDATE users SET oidc_issuer = ?, oidc_sub = ? WHERE id = ?').run(issuer, sub, userId);
}

export function unlinkUserOidc(userId) {
    db.prepare('UPDATE users SET oidc_issuer = NULL, oidc_sub = NULL WHERE id = ?').run(userId);
}

export function setUserLocale(userId, locale) {
    db.prepare('UPDATE users SET locale = ? WHERE id = ?').run(locale || null, userId);
}
