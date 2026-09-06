# Architecture

Relay is a split deploy: a static Vite client on Vercel and an always-on Express process on Render.

```
Browser (Vercel)
  ├─ better-auth client ── cookies ──► Express /api/auth/*
  ├─ REST (chat, profile, telegram) ─► Express
  └─ Socket.IO client ───────────────► Socket.IO on the same HTTP server

Render process
  ├─ Express app (createApp, no listen in tests)
  ├─ Socket.IO rooms + presence broadcasts
  ├─ Telegraf long polling (OTP linking)
  ├─ Telegram Login Widget HMAC auth
  └─ Drizzle + pg Pool ──► PostgreSQL
```

## Auth

`backend/src/auth.ts` configures better-auth with email/password + username, Google/GitHub, account linking, passkeys, TOTP 2FA, and account deletion. Native Telegram Login Widget auth is implemented under `/telegram/widget/*` with HMAC verification. Profile, privacy, and presence fields live on `user` and are exposed via `/me/profile` and `/users/:id/profile`. Session cookies are cross-site in production.

The frontend uses routed settings pages (`/settings/*`) and a messenger-style shell with theme toggle.

REST and sockets share `resolveSession()` in `requireSession.ts`.

## Messaging

`POST /conversations/direct` finds or creates a two-person conversation. History is `GET /conversations/:id/messages`. Live traffic uses Socket.IO events from `realtime/events.ts`. Membership is checked before join and send. Presence updates (`presence:update`) track online/offline and `lastActiveAt`.

## Telegram

OTP linking: `POST /telegram/link` issues a token; bot `/start` stores `telegramChatId`; send/verify handle hashed codes.

Native auth: Telegram Login Widget posts to `/telegram/widget/signin` or `/telegram/widget/link`.

## Tests

`tests/setup.ts` creates schema `test`, applies `drizzle/0000_init.sql`, and truncates between cases. The app Pool sets `search_path TO test, public` when `NODE_ENV=test`.
