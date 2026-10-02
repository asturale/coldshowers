import express from 'express';
import { requireLogin } from './middleware.js';
import { findUserById, setUserLocale } from '../db/auth.js';
import { logShower, listShowers, deleteShower, getCurrentStreak, getLongestStreak, chartData, totalCount, localDateStr, showersCountByDayInMonth, showersOnDate } from '../db/showers.js';
import { setTargetDuration, setReminder, setNotificationSettings, REMINDER_METHODS } from '../db/settings.js';
import { sendReminder } from '../lib/notify.js';
import { SUPPORTED_LOCALES } from '../lib/i18n.js';
import { saveSubscription, removeSubscription, hasSubscription } from '../db/push.js';
import { VAPID_PUBLIC } from '../lib/push.js';

const router = express.Router();
router.use(requireLogin);

function dashboardLocals(req) {
    const user = findUserById(req.session.userId);
    return {
        user,
        targetSeconds: user.target_duration_seconds,
        showers: listShowers(30),
        totalCount: totalCount(),
        currentStreak: getCurrentStreak(),
        longestStreak: getLongestStreak(),
        chart: chartData(),
    };
}

router.get('/', (req, res) => {
    res.render('dashboard', dashboardLocals(req));
});

router.post('/log', (req, res) => {
    const user = findUserById(req.session.userId);
    const duration = Number(req.body.duration_seconds);
    logShower(Number.isFinite(duration) && duration > 0 ? duration : user.target_duration_seconds, user.target_duration_seconds);
    res.redirect('/');
});

router.post('/showers/:id/delete', (req, res) => {
    deleteShower(req.params.id);
    // Optional redirect target (e.g. back to the calendar day it was shown
    // on) -- restricted to same-app relative paths, never an open redirect.
    const back = typeof req.body.redirect === 'string' && req.body.redirect.startsWith('/') && !req.body.redirect.startsWith('//') ? req.body.redirect : '/';
    res.redirect(back);
});

// Calendar month view: shows which days already have a logged shower, and
// is the entry point for adding a RETROACTIVE one (tap a day -> day-detail
// page with its own log form, see /calendar/:date below).
router.get('/calendar', (req, res) => {
    const now = new Date();
    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;
    const counts = showersCountByDayInMonth(year, month);
    const firstOfMonth = new Date(year, month - 1, 1);
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday-first, 0 = Mon
    const todayStr = localDateStr(now);

    const days = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        days.push({ day: d, dateStr, count: counts.get(dateStr) || 0, isToday: dateStr === todayStr });
    }

    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth < 1) {
        prevMonth = 12;
        prevYear -= 1;
    }
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
        nextMonth = 1;
        nextYear += 1;
    }

    res.render('calendar', {
        days,
        firstWeekday,
        prevMonth,
        prevYear,
        nextMonth,
        nextYear,
        monthLabel: firstOfMonth.toLocaleDateString(res.locals.dateLocale, { month: 'long', year: 'numeric' }),
    });
});

router.get('/calendar/:date', (req, res) => {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(404).render('404');
    const user = findUserById(req.session.userId);
    res.render('calendar-day', { dateStr: date, showers: showersOnDate(date), targetSeconds: user.target_duration_seconds });
});

router.post('/calendar/:date/log', (req, res) => {
    const { date } = req.params;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(404).render('404');
    const user = findUserById(req.session.userId);
    const [y, m, d] = date.split('-').map(Number);
    const time = /^\d{2}:\d{2}$/.test(req.body.time || '') ? req.body.time : '12:00';
    const [hh, mm] = time.split(':').map(Number);
    const startedAt = new Date(y, m - 1, d, hh, mm).getTime();
    const duration = Number(req.body.duration_seconds);
    logShower(Number.isFinite(duration) && duration > 0 ? duration : user.target_duration_seconds, user.target_duration_seconds, startedAt);
    res.redirect(`/calendar/${date}`);
});

function settingsLocals(req, extra) {
    const user = findUserById(req.session.userId);
    return {
        user,
        targetSeconds: user.target_duration_seconds,
        reminderEnabled: !!user.reminder_enabled,
        reminderTime: user.reminder_time,
        reminderMethod: user.reminder_method,
        reminderMethods: REMINDER_METHODS,
        ntfyBaseUrl: user.ntfy_base_url,
        ntfyTopic: user.ntfy_topic,
        ntfyToken: user.ntfy_token,
        telegramBotToken: user.telegram_bot_token,
        telegramChatId: user.telegram_chat_id,
        vapidPublicKey: VAPID_PUBLIC,
        pushSubscribed: hasSubscription(user.id),
        storedLocale: user.locale,
        testResult: null,
        ...extra,
    };
}

router.get('/settings', (req, res) => {
    res.render('settings', settingsLocals(req));
});

router.post('/settings/target-duration', (req, res) => {
    setTargetDuration(req.session.userId, req.body.target_seconds);
    res.redirect('/settings');
});

router.post('/settings/reminder', (req, res) => {
    setReminder(req.session.userId, { enabled: req.body.enabled === 'on', time: req.body.time });
    res.redirect('/settings');
});

router.post('/settings/notifications', (req, res) => {
    setNotificationSettings(req.session.userId, {
        method: req.body.method,
        ntfyBaseUrl: req.body.ntfy_base_url,
        ntfyTopic: req.body.ntfy_topic,
        ntfyToken: req.body.ntfy_token,
        telegramBotToken: req.body.telegram_bot_token,
        telegramChatId: req.body.telegram_chat_id,
    });
    res.redirect('/settings');
});

router.post('/settings/notifications/test', async (req, res) => {
    const user = findUserById(req.session.userId);
    try {
        await sendReminder(user, res.locals.t('reminder.title'), res.locals.t('reminder.test_body'));
        res.render('settings', settingsLocals(req, { testResult: 'ok' }));
    } catch (e) {
        res.render('settings', settingsLocals(req, { testResult: 'error' }));
    }
});

router.post('/push-subscribe', (req, res) => {
    saveSubscription(req.session.userId, req.body);
    res.json({ ok: true });
});

router.post('/push-unsubscribe', (req, res) => {
    if (req.body.endpoint) removeSubscription(req.body.endpoint);
    res.json({ ok: true });
});

router.post('/settings/locale', (req, res) => {
    const { locale } = req.body;
    if (!locale || SUPPORTED_LOCALES.includes(locale)) setUserLocale(req.session.userId, locale || null);
    res.redirect('/settings');
});

export default router;
