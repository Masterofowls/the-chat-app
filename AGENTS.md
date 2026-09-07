## Learned User Preferences

- Prefer Telegram Web look-and-feel (blue accent `#3390ec`, dark `#0e1621`/`#17212b`, Roboto/system sans; light + dark via `data-theme`).
- Settings should be separate pages with back navigation, not a single dense settings dump.
- Prefer smoother transitions/loading, less obvious component chrome; desktop dual-pane (~420px list); mobile Telegram list-XOR-chat with back.
- Want full PWA + service worker with offline support; header should ping the backend and show connecting vs Relay like Telegram.
- Prefer Lucide animated icons (lucide-animated.com) where icons are used.
- Keep AI/tooling directories such as `.cursor`, `.claude`, and `.copilot` in gitignore (including global ignore when asked).
- Prefer deploying with the official CLIs (Render CLI for API, Vercel CLI for frontend) when deployment is requested.

## Learned Workspace Facts

- Product name is Relay: realtime 1:1 messaging under `frontend/` (Vite React, CSS Modules, Vercel) and `backend/` (Express + Socket.IO, Render always-on).
- Auth is better-auth: username/password, Google and GitHub OAuth, passkeys, TOTP 2FA, Telegram OTP linking, and native Telegram Login when bot env is set.
- Data layer is Drizzle ORM on PostgreSQL; Jest/Supertest/socket tests use a dedicated `test` schema on the same database.
- Local defaults: API on port 9000, web on port 9001; theme preference is stored as `relay-theme`.
- Production auth cookies use `sameSite: "none"` and `secure: true` so the Vercel frontend can call the Render API with credentials; `RP_ID` must match the frontend domain.
- Backend must stay always-on on Render because Socket.IO and Telegraf long polling require a persistent process.
