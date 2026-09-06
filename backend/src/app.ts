import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { allowedOrigins } from "./config.js";
import { resolveSession } from "./middleware/requireSession.js";
import { conversationsRouter } from "./routes/conversations.js";
import { telegramOtpRouter } from "./routes/telegram-otp.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.all("/api/auth/{*splat}", toNodeHandler(auth));
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "messaging-app-api" });
  });

  app.get("/me", async (req, res, next) => {
    try {
      const session = await resolveSession(req.headers);
      if (!session) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }
      res.json({ user: session.user });
    } catch (error) {
      next(error);
    }
  });

  app.use("/telegram", telegramOtpRouter);
  app.use("/conversations", conversationsRouter);

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[api]", message);
    res.status(500).json({ error: message });
  });

  return app;
}

export const app = createApp();
