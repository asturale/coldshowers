import express from 'express';
import { requireLogin } from './middleware.js';
import { findUserById, setUserLocale } from '../db/auth.js';
import { logShower, listShowers, deleteShower, getCurrentStreak, getLongestStreak, chartData, totalCount } from '../db/showers.js';
import { setTargetDuration, setReminder, setNotificationSettings, REMINDER_METHODS } from '../db/settings.js';
import { sendReminder } from '../lib/notify.js';
import { SUPPORTED_LOCALES } from '../lib/i18n.js';

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
    res.redirect('/');
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

router.post('/settings/locale', (req, res) => {
    const { locale } = req.body;
    if (!locale || SUPPORTED_LOCALES.includes(locale)) setUserLocale(req.session.userId, locale || null);
    res.redirect('/settings');
});

export default router;
