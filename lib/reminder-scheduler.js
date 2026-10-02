import { db } from '../db/index.js';
import { markRemindedToday } from '../db/settings.js';
import { sendReminder } from './notify.js';
import { translator, SUPPORTED_LOCALES } from './i18n.js';

const CHECK_INTERVAL_MS = 60 * 1000; // minute-granularity reminder times need a minute-granularity check

function localDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function currentTimeStr(d) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function startReminderScheduler() {
    setInterval(checkAndSend, CHECK_INTERVAL_MS).unref();
}

async function checkAndSend() {
    const now = new Date();
    const today = localDateStr(now);
    const nowTime = currentTimeStr(now);

    const due = db
        .prepare(
            `SELECT * FROM users
             WHERE reminder_enabled = 1
             AND reminder_time = ?
             AND (last_reminded_date IS NULL OR last_reminded_date != ?)
             AND reminder_method != 'none'`
        )
        .all(nowTime, today);

    for (const user of due) {
        try {
            const locale = user.locale && SUPPORTED_LOCALES.includes(user.locale) ? user.locale : 'en';
            const t = translator(locale);
            await sendReminder(user, t('reminder.title'), t('reminder.body'));
        } catch (e) {
            console.error(`reminder-scheduler: failed to notify user ${user.id}: ${e.message}`);
        }
        markRemindedToday(user.id, today);
    }
}
