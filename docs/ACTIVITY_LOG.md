# Activity log

## 2026-09-06 20:47 UTC+3

- Wired backend `.env` to the Supabase project (`ktmmjynneroqhftbbllv`) using the IPv4 session pooler in `eu-west-1`.
- Pushed Drizzle tables to `public` (auth, conversations, telegram/otp). Tests use the isolated `test` schema on the same instance.


## 2026-09-06 18:47 UTC+3

- Updated the existing global gitignore at `C:\Users\mrdan\.gitignore_global` (already wired via `core.excludesfile`) to always ignore `.cursor`, `.claude`, `.copilot`, and other common agent folders.

## 2026-09-06 18:15 UTC+3

- Session load now times out after 4s so the sign-in screen appears when the API is offline.
- Verified the production Vite preview: Google + passkey sign-in card renders.

## 2026-09-06 18:10 UTC+3

- Installed backend/frontend deps, fixed TS 7 path config, two-factor schema columns, and Jest suite collection without DATABASE_URL.
- Backend typecheck/lint/build and unit + auth route tests pass. Frontend typecheck/lint/production build pass.
- Integration/socket tests skip until Postgres `DATABASE_URL` is set.

## 2026-09-06 17:43 UTC+3

- Scaffolded the Relay monorepo (`backend`, `frontend`, `shared`) from the realtime chatting spec.
- Implemented Express auth (Google, passkeys, 2FA), Drizzle schema, Telegram OTP, Socket.IO rooms, and REST conversation routes.
- Added Vite React client with CSS Modules chat UI, Telegram linking, TOTP QR enrollment, and `useChat`.
- Wrote Jest unit, Supertest, and socket.io-client tests against a dedicated `test` schema.
