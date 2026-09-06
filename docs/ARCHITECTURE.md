# Architecture

Relay is a split deploy: a static Vite client on Vercel and an always-on Express process on Render.

```
Browser (Vercel)
  ├─ better-auth client ── cookies ──► Express /api/auth/*
  ├─ REST (conversations, telegram) ─► Express
  └─ Socket.IO client ───────────────► Socket.IO on the same HTTP server

Render process
  ├─ Express app (createApp, no listen in tests)
  ├─ Socket.IO rooms: conversation:<id>, user:<id>
  ├─ Telegraf long polling (OTP + account linking)
  └─ Drizzle + pg Pool ──► PostgreSQL
```

## Auth

`backend/src/auth.ts` configures better-auth with the Drizzle adapter, email/password + username plugin, Google and GitHub OAuth, account linking, the passkey plugin, and the twoFactor plugin (`allowPasswordless: true` so OAuth users can enroll TOTP). Session cookies are cross-site in production. After signup, users link additional methods from the Security panel (`linkSocial`, passkey registration, TOTP, Telegram).

REST and sockets share `resolveSession()` in `requireSession.ts`.

## Messaging

`POST /conversations/direct` finds or creates a two-person conversation. History is `GET /conversations/:id/messages`. Live traffic uses Socket.IO events from `realtime/events.ts`. Membership is checked before join and send.

## Telegram

`POST /telegram/link` issues a one-time token. The bot `/start <token>` writes `telegramChatId`. `POST /telegram/send` stores a bcrypt hash and asks Telegraf to deliver the plaintext code. `POST /telegram/verify` consumes a valid unused hash.

## Tests

`tests/setup.ts` creates schema `test`, applies `drizzle/0000_init.sql`, and truncates between cases. The app Pool sets `search_path TO test, public` when `NODE_ENV=test`.
