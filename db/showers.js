import { db } from './index.js';

export function logShower(durationSeconds, targetSeconds, startedAt = Date.now()) {
    const now = Date.now();
    db.prepare(
        'INSERT INTO showers (started_at, duration_seconds, target_seconds, created_at) VALUES (?, ?, ?, ?)'
    ).run(startedAt, Math.max(0, Math.round(durationSeconds)), Math.max(1, Math.round(targetSeconds)), now);
}

export function listShowers(limit = 365) {
    return db.prepare('SELECT * FROM showers ORDER BY started_at DESC LIMIT ?').all(limit);
}

export function deleteShower(id) {
    db.prepare('DELETE FROM showers WHERE id = ?').run(id);
}

export function totalCount() {
    return db.prepare('SELECT COUNT(*) AS n FROM showers').get().n;
}

// 'YYYY-MM-DD' in the server's own local TZ (compose.yaml sets
// TZ=Europe/Amsterdam) -- deliberately NOT toISOString(), which is UTC and
// would file a shower under the wrong calendar day near midnight.
function localDateStr(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function loggedDates() {
    const rows = db.prepare('SELECT started_at FROM showers').all();
    return new Set(rows.map((r) => localDateStr(new Date(r.started_at))));
}

// Current streak: consecutive days ending today, OR ending yesterday if
// today hasn't happened yet (today isn't "missed" until it's actually
// over) -- so the streak doesn't drop to 0 first thing in the morning
// before there's been a chance to log today's shower.
export function getCurrentStreak(now = new Date()) {
    const dates = loggedDates();
    const cursor = new Date(now);
    if (!dates.has(localDateStr(cursor))) cursor.setDate(cursor.getDate() - 1);
    let streak = 0;
    while (dates.has(localDateStr(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
}

// Longest streak ever, computed over the full set of distinct logged days.
export function getLongestStreak() {
    const dates = [...loggedDates()].sort();
    if (dates.length === 0) return 0;
    let longest = 1;
    let current = 1;
    for (let i = 1; i < dates.length; i++) {
        const prev = new Date(dates[i - 1]);
        const next = new Date(dates[i]);
        const dayGap = Math.round((next - prev) / (24 * 3600 * 1000));
        current = dayGap === 1 ? current + 1 : 1;
        longest = Math.max(longest, current);
    }
    return longest;
}

// Chart data: one point per logged shower, oldest first, capped so a
// long history doesn't balloon the page payload.
export function chartData(limit = 180) {
    const rows = db
        .prepare('SELECT started_at, duration_seconds, target_seconds FROM showers ORDER BY started_at ASC LIMIT ?')
        .all(limit);
    return rows.map((r) => ({ date: localDateStr(new Date(r.started_at)), durationSeconds: r.duration_seconds, targetSeconds: r.target_seconds }));
}
