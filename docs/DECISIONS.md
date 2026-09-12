# Decisions

## 2026-09-12 — Public profile links

QR/share URLs (`/profile/:id`) are viewable without signing in. `GET /users/:id/profile` is public and never returns another user's email. Presence still honors `showLastActive` / `showDeviceInfo`. Messaging still requires a session.

## 2026-09-12 — Design tokens over ad-hoc CSS

Relay keeps Telegram Web surfaces (`#0e1621` / `#17212b` / `#3390ec`) but all new UI uses semantic tokens (`--space-*`, `--text-*`, `--radius-*`, `--control-h`, `--focus`). Muted text is `#8ea3b5` / `#5a6168` so body copy meets WCAG AA. High-frequency chat chrome stays nearly motionless; settings/profile get hover feedback only.

## 2026-09-06 — Discord/Telegram shell + PWA

UI follows a Discord-like cool palette and Telegram-like settings lists. Chat list stays beside the conversation on mobile (expandable/collapsible width). Connectivity title pings `/health` and shows `connecting…` when the API is down. Sign-out lives on the profile page only. Offline support uses `vite-plugin-pwa` (generateSW + autoUpdate). Animated icons are vendored from lucide-animated (motion) under `frontend/src/components/icons`.

## 2026-09-06 — Messenger settings + profile platform

Settings are separate routes (passkeys, accounts, 2FA, sessions, privacy, password, Telegram, danger). Profile stores status/bio/privacy/last-active; avatars are client-cropped JPEG data URLs. Native Telegram auth uses the Login Widget with HMAC verification rather than the incompatible better-auth-telegram peer range.

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
