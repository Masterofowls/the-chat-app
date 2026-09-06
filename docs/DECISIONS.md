# Decisions

## 2026-09-06 — Username/password as primary account, then link providers

Users create a Relay account with username + password (email required by better-auth). Passkey, TOTP, Google, GitHub, and Telegram are linked afterward from Security. Account linking allows different OAuth emails so social providers can attach to an existing username account.

## 2026-09-06 — Split Vercel + Render instead of one serverless host

Socket.IO and Telegraf long polling need a long-lived Node process. Render Web Service is the API host. The React client stays on Vercel.

## 2026-09-06 — Telegram instead of SMS for OTP

The stack stays free-tier friendly. OTPs are hashed with bcryptjs and delivered only to a linked Telegram chat.

## 2026-09-06 — Shared allowedOrigins

Express CORS and Socket.IO CORS read the same list from `config.ts` so cookie-authenticated sockets do not drift from REST.

## 2026-09-06 — Test isolation via Postgres `test` schema

One `DATABASE_URL`, no second database. Setup creates the schema, applies the init SQL, and truncates tables between tests.

## 2026-09-06 — Production cookies are SameSite=None; Secure

The frontend and API are on different sites. Local development still uses SameSite=Lax so HTTP localhost works.
