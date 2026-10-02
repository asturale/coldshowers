import { db } from './index.js';

export const REMINDER_METHODS = ['none', 'ntfy', 'telegram', 'webpush'];

export function setTargetDuration(userId, seconds) {
    const n = Math.max(1, Math.min(3600, Math.round(Number(seconds)) || 120));
    db.prepare('UPDATE users SET target_duration_seconds = ? WHERE id = ?').run(n, userId);
}

export function setPrepCountdown(userId, { enabled, seconds }) {
    const n = Math.max(0, Math.min(300, Math.round(Number(seconds)) || 15));
    db.prepare('UPDATE users SET prep_enabled = ?, prep_duration_seconds = ? WHERE id = ?').run(enabled ? 1 : 0, n, userId);
}

export function setReminder(userId, { enabled, time }) {
    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : '07:00';
    db.prepare('UPDATE users SET reminder_enabled = ?, reminder_time = ? WHERE id = ?').run(enabled ? 1 : 0, validTime, userId);
}

// BYOK notification channel -- see db/index.js's schema comment for why this
// is per-user configurable rather than hardcoded to one deployment's own
// ntfy/Telegram setup.
export function setNotificationSettings(userId, { method, ntfyBaseUrl, ntfyTopic, ntfyToken, telegramBotToken, telegramChatId }) {
    const validMethod = REMINDER_METHODS.includes(method) ? method : 'none';
    db.prepare(
        `UPDATE users SET
            reminder_method = ?,
            ntfy_base_url = ?,
            ntfy_topic = ?,
            ntfy_token = ?,
            telegram_bot_token = ?,
            telegram_chat_id = ?
         WHERE id = ?`
    ).run(
        validMethod,
        (ntfyBaseUrl || 'https://ntfy.sh').trim(),
        ntfyTopic ? ntfyTopic.trim() : null,
        ntfyToken ? ntfyToken.trim() : null,
        telegramBotToken ? telegramBotToken.trim() : null,
        telegramChatId ? telegramChatId.trim() : null,
        userId
    );
}

export function markRemindedToday(userId, dateStr) {
    db.prepare('UPDATE users SET last_reminded_date = ? WHERE id = ?').run(dateStr, userId);
}
