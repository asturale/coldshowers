# Cold Showers

A small self-hosted tracker for cold showers: a timer, a configurable target duration, streaks, a progress chart, and an optional daily reminder.

## Features

- **Timer**: start/stop to log the actual duration, or a one-tap "log target duration now" button.
- **Configurable target**: default 2 minutes, adjustable in Settings.
- **Streaks and chart**: current/longest streak, total count, and a duration-over-time chart (Chart.js).
- **Configurable reminder**: a daily nudge at a time you choose.
- **Bring-your-own notifications**: the reminder can be sent via [ntfy](https://ntfy.sh) (your own server/topic) or your own Telegram bot — nothing is hardcoded to any specific deployment, so plug in your own credentials.
- **Login**: single-user, session-based (cookie), first launch walks you through creating the one account.
- **English and Dutch** UI (English by default).

## Running it

```sh
docker compose up -d --build
```

The app listens on port 3000 inside the container. Data is stored as SQLite under `./data` — back that directory up however you already back up the rest of your Docker volumes.

Put this behind your own reverse proxy (Caddy, nginx, Traefik, ...) for TLS; it's designed to run on a private network (e.g. behind a VPN/Tailscale) since it isn't hardened for direct public exposure.

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_PATH` | `/data/coldshowers.db` | SQLite file location |
| `SESSION_SECRET` | random on each restart if unset | set this to a fixed value so logins survive a container restart |
| `PORT` | `3000` | HTTP port |

## Notifications

Configure these per-user in Settings, not via environment variables — each user brings their own:

- **ntfy**: server URL (defaults to the public `https://ntfy.sh`), topic name, and an optional access token.
- **Telegram**: your own bot token (create one via [@BotFather](https://t.me/BotFather)) and your chat ID.

## Tech stack

Express, EJS, better-sqlite3, express-session with a SQLite-backed store — no build step, no external services required beyond whatever notification channel you choose to configure.
