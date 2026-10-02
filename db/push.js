import { db } from './index.js';

export function saveSubscription(userId, { endpoint, keys }) {
    const now = Date.now();
    db.prepare(
        `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`
    ).run(userId, endpoint, keys.p256dh, keys.auth, now);
}

export function removeSubscription(endpoint) {
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}

export function listSubscriptions(userId) {
    return db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(userId);
}

export function hasSubscription(userId) {
    return !!db.prepare('SELECT 1 FROM push_subscriptions WHERE user_id = ? LIMIT 1').get(userId);
}
