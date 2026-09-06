import "./load-env.js";
import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./config.js";
import { createBot, launchBot, stopBot } from "./telegram/bot.js";
import { initSocket } from "./realtime/socket.js";

const httpServer = createServer(app);
initSocket(httpServer);
createBot();

const port = Number(process.env.PORT ?? env.PORT);

httpServer.listen(port, "0.0.0.0", () => {
  console.info(`[api] listening on 0.0.0.0:${port}`);
  void launchBot().then(() => {
    if (env.TELEGRAM_BOT_TOKEN) {
      console.info("[telegram] long polling started");
    }
  });
});

const shutdown = () => {
  void stopBot();
  httpServer.close(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
