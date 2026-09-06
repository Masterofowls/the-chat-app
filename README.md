# Relay

Realtime 1:1 messaging with username/password accounts, Google and GitHub OAuth, passkeys, Telegram OTP, and TOTP 2FA. The frontend is a Vite React app for Vercel. The backend is an always-on Express + Socket.IO service for Render, with PostgreSQL and a long-polling Telegram bot.

## Stack

- **Frontend:** React + TypeScript (Vite), better-auth client, Socket.IO client, CSS Modules, qrcode.react — Vercel
- **Backend:** Express + TypeScript, better-auth, Drizzle ORM, PostgreSQL, Socket.IO, Telegraf (long polling), bcryptjs — Render
- **Tests:** Jest, ts-jest, Supertest, socket.io-client against a dedicated `test` schema

## Local setup

1. Create a PostgreSQL database and copy `backend/.env.example` to `backend/.env`.
2. Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL=http://localhost:9000`, and `CLIENT_ORIGIN=http://localhost:9001`.
3. Add Google and/or GitHub OAuth credentials when you want those providers. For passkeys, keep `RP_ID=localhost` locally.
4. Optional: create a Telegram bot and set `TELEGRAM_BOT_TOKEN` plus `BOT_USERNAME`.
5. Copy `frontend/.env.example` to `frontend/.env` with `VITE_API_URL=http://localhost:9000`.
6. Apply schema: `cd backend && npm install && npm run db:push` (or run `drizzle/0000_init.sql`).
7. Start API on port 9000: `npm run dev`.
8. Start web on port 9001: `cd frontend && npm install && npm run dev`.

## Scripts

| Location | Command | Purpose |
|---|---|---|
| backend | `npm run dev` | tsx watch server |
| backend | `npm run build` / `npm start` | compile and run on `0.0.0.0:$PORT` |
| backend | `npm test` | Jest unit, REST, and socket tests |
| backend | `npm run db:generate` / `db:migrate` / `db:push` | Drizzle Kit |
| frontend | `npm run dev` | Vite on 9001 |
| frontend | `npm run build` | production bundle |

## Auth and cookies

Production cookies use `sameSite: "none"` and `secure: true` so the Vercel origin can call Render with credentials. Local development uses `lax` + insecure cookies. `RP_ID` must exactly match the deployed frontend domain.

## Telegram OTP

1. Sign up with username/password (or Google/GitHub), open **Security**, then link passkey, 2FA, OAuth, or Telegram.
2. Telegram opens `https://t.me/<bot>?start=<token>` and the bot stores your chat id.
3. Send / verify a hashed 6-digit OTP. No SMS vendor is used.

## Deploy

| Layer | Platform | Notes |
|---|---|---|
| Frontend | Vercel | Root directory `frontend`, set `VITE_API_URL` |
| Backend | Render Web Service | Build `npm install && npm run build`, start `npm start`, always-on |
| Database | Render / Neon / Railway Postgres | Single `DATABASE_URL`; tests use the `test` schema |

See `backend/render.yaml` and `frontend/vercel.json`.
