# Activity log

## 2026-09-07 16:40 UTC+3

- Fixed profile QR: white card holds only the code; long share URL wraps in `.qr-url` with copy/open actions.
- Instant shell feel: disabled staggered `.page-fade`, boot screen instead of cascade skeletons, self-profile seeds from session.
- SEO: richer `index.html` meta/OG/JSON-LD, `robots.txt`, `sitemap.xml`, `useDocumentMeta`, Vercel cache headers.
- Restored AppLayout structure after edit; typecheck/lint/build pass locally.

## 2026-09-07 02:10 UTC+3

- Telegram adaptive shell: `data-mobile-chat` list/chat swap, desktop-only collapse, conversations + People search section with time hints.
- ChatWindow: mobile `onBack`, bubble footer time, circular send, subtle live dot; ChatPane empty copy + navigate home.
- E2E fixtures (`e2e-fixtures.ts`) + App/main/AppLayout seed path when `VITE_E2E` / `relay-e2e` / `?e2e=1`.
- Profile headings sans; typecheck + lint clean.

## 2026-09-07 02:05 UTC+3

- Redesigned frontend to Telegram Web A style: dark/light tokens (`#0e1621` / `#17212b` / `#3390ec`), Roboto, flat panels.
- Mobile (<720px): list XOR chat via `data-mobile-chat`; desktop dual-pane ~420px list.
- Chat thread wallpaper, bubble time meta, pill composer + circular send; settings as Telegram section cards.
- Files: `global.css`, `ChatWindow.module.css`, `index.html`, `AppLayout.tsx` (`data-mobile-chat`).

## 2026-09-07 00:20 UTC+3

- Fixed profile/settings layout: sidebar `display:none` was forcing main into a narrow first grid column.
- Nested self profile at `/settings/profile` (`/me` redirects); settings nav + panel work on mobile/desktop.
- Deployed `8221179` to https://messaging-app-frontend-five.vercel.app.

## 2026-09-07 00:06 UTC+3

- Pushed `feat: Discord/Telegram UI polish, PWA, and connectivity header` (`b2c8477`).
- Deployed Vercel production: https://messaging-app-frontend-five.vercel.app (`dpl_EJhQ8yEP2aTJ1SfXwDXzZr4ZQToN`).
- API unchanged (frontend-only); Render not redeployed.

## 2026-09-06 23:50 UTC+3

- Telegram/Discord polish: expandable chat list, mobile side-by-side layout, smooth scroll areas, cohesive panel surfaces.
- Header connectivity: periodic `/health` ping shows `Relay` vs `connecting…`.
- Settings: back to chats + nested back on mobile; Telegram-style list rows; sign-out moved to profile.
- PWA: `vite-plugin-pwa` service worker, offline assets, auto-update registration.
- Lucide-animated icons (motion) for shell/settings; improved self/guest profile views with Message/Share/QR.
- Frontend `typecheck`, `lint`, and production build succeeded (SW + webmanifest generated).

## 2026-09-06 23:26 UTC+3

- Pushed `feat: messenger UI, settings routes, profile and presence` (`41a2a5d`).
- Redeployed Render API (`dep-daesoo9t0dsc73bk7mkg`) and Vercel production (`messaging-app-frontend-five.vercel.app`).

## 2026-09-06 22:55 UTC+3

- Expanded Relay into a messenger-style shell with theme toggle, routed settings pages, and full profile.
- Added passkey list/remove, 2FA disable, sessions revoke, password change, account delete, privacy toggles.
- Added presence/last-active/device fields, JPEG avatar crop upload, share/QR profile, native Telegram Login Widget auth.

## 2026-09-06 22:25 UTC+3

- Pushed `feat: username/password auth with provider linking` (`a138380`) and redeployed.
- Render API deploy `dep-daerse0n74is73f7s1j0` succeeded; Vercel production aliased to `messaging-app-frontend-five.vercel.app`.

## 2026-09-06 22:06 UTC+3

- Enabled username/password signup + username sign-in (better-auth `emailAndPassword` + `username` plugin).
- Added GitHub OAuth, account linking UI, and Security panel ordering for passkey / 2FA / Google / GitHub / Telegram.
- Pushed `username` / `display_username` columns; auth integration tests cover credential signup/signin.

## 2026-09-06 21:45 UTC+3

- Deployed frontend to Vercel via CLI as `messaging-app-frontend`.
- Production URL: https://messaging-app-frontend-five.vercel.app (bundle points at Render API).
- Updated Render `CLIENT_ORIGIN` / `RP_ID` for that Vercel domain and redeployed API (`dep-daeraldg1s2s73dff3f0`).

## 2026-09-06 21:33 UTC+3

- Checked Render `messaging-app-api` (`srv-daeqlngu01pc73fl41i0`): not suspended, Frankfurt starter, health path `/health`.
- Live probes: `/health` and `/api/auth/ok` 200; `/` 404; `/me` 401 without session.

## 2026-09-06 21:17 UTC+3

- Checked live API `https://messaging-app-api-20qb.onrender.com/`: root `GET /` is Express 404 (`Cannot GET /`).
- `/health` and `/api/auth/ok` return 200; `/me` and `/conversations` correctly return 401 without a session.

## 2026-09-06 21:08 UTC+3

- Created private GitHub repo `Masterofowls/the-chat-app` and Render web service `messaging-app-api` (Frankfurt, starter).
- Live URL `https://messaging-app-api-20qb.onrender.com` — `/health` returns 200.


## 2026-09-06 21:07 UTC+3

- Created private GitHub repo `Masterofowls/the-chat-app` and Render web service `messaging-app-api` (Frankfurt, starter).
- First build failed (prod install skipped TypeScript); fixed with `--include=dev` and redeployed successfully.

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
