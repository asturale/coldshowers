// BYOK notification senders. Each user plugs in their own ntfy server/topic
// or their own Telegram bot token + chat id (see db/settings.js) -- this
// project is meant to be shared on GitHub, so it never assumes any specific
// deployment's own notification infrastructure. 'webpush' is the one
// exception that isn't BYOK in the same sense (it uses this installation's
// own VAPID keypair, see lib/push.js), but still requires the user to
// explicitly opt in from their own browser -- nothing is pushed anywhere
// without that.
import { listSubscriptions } from '../db/push.js';
import { sendToSubscription } from './push.js';

async function sendNtfy(user, title, body) {
    if (!user.ntfy_topic) throw new Error('ntfy topic not configured');
    const url = `${user.ntfy_base_url.replace(/\/$/, '')}/${user.ntfy_topic}`;
    const headers = { Title: title };
    if (user.ntfy_token) headers.Authorization = `Bearer ${user.ntfy_token}`;
    const res = await fetch(url, { method: 'POST', headers, body });
    if (!res.ok) throw new Error(`ntfy request failed: ${res.status}`);
}

async function sendTelegram(user, title, body) {
    if (!user.telegram_bot_token || !user.telegram_chat_id) throw new Error('Telegram bot token/chat id not configured');
    const url = `https://api.telegram.org/bot${user.telegram_bot_token}/sendMessage`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: user.telegram_chat_id, text: `${title}\n${body}` }),
    });
    if (!res.ok) throw new Error(`Telegram request failed: ${res.status}`);
}

// A user can have multiple subscribed devices (phone + laptop); one dead
// subscription (sendToSubscription already prunes 404/410s) shouldn't stop
// delivery to the others. Throws only if every device failed, or there was
// no subscribed device at all, so the Settings "send test" button and the
// reminder scheduler both see a clear success/failure the same way the
// other two methods already do.
async function sendWebPush(user, title, body) {
    const subs = listSubscriptions(user.id);
    if (subs.length === 0) throw new Error('no push subscription registered for this device yet');
    const results = await Promise.allSettled(subs.map((sub) => sendToSubscription(sub, { title, body, url: '/' })));
    if (results.every((r) => r.status === 'rejected')) {
        throw new Error(results[0].reason?.message || 'push delivery failed');
    }
}

export async function sendReminder(user, title, body) {
    if (user.reminder_method === 'ntfy') return sendNtfy(user, title, body);
    if (user.reminder_method === 'telegram') return sendTelegram(user, title, body);
    if (user.reminder_method === 'webpush') return sendWebPush(user, title, body);
    // 'none' -- nothing to do.
}
