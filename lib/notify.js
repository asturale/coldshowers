// BYOK notification senders. Each user plugs in their own ntfy server/topic
// or their own Telegram bot token + chat id (see db/settings.js) -- this
// project is meant to be shared on GitHub, so it never assumes any specific
// deployment's own notification infrastructure.

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

export async function sendReminder(user, title, body) {
    if (user.reminder_method === 'ntfy') return sendNtfy(user, title, body);
    if (user.reminder_method === 'telegram') return sendTelegram(user, title, body);
    // 'none' -- nothing to do.
}
