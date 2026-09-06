import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.loadEnvFile(path.join(root, ".env"));

const cli = readFileSync(path.join(homedir(), ".render", "cli.yaml"), "utf8");
const key = cli.match(/^\s*key:\s*(.+)$/m)?.[1]?.trim();
if (!key) {
  throw new Error("Render API key not found in CLI config");
}

const serviceId = "srv-daeqlngu01pc73fl41i0";
const serviceUrl = "https://messaging-app-api-20qb.onrender.com";
const clientOrigin = "https://messaging-app-frontend-five.vercel.app";
const rpId = new URL(clientOrigin).hostname;

const vars = [
  { key: "NODE_ENV", value: "production" },
  { key: "DATABASE_URL", value: process.env.DATABASE_URL },
  { key: "BETTER_AUTH_SECRET", value: process.env.BETTER_AUTH_SECRET },
  { key: "BETTER_AUTH_URL", value: serviceUrl },
  { key: "CLIENT_ORIGIN", value: clientOrigin },
  { key: "RP_ID", value: rpId },
  { key: "GOOGLE_CLIENT_ID", value: process.env.GOOGLE_CLIENT_ID || "" },
  { key: "GOOGLE_CLIENT_SECRET", value: process.env.GOOGLE_CLIENT_SECRET || "" },
  { key: "GITHUB_CLIENT_ID", value: process.env.GITHUB_CLIENT_ID || "" },
  { key: "GITHUB_CLIENT_SECRET", value: process.env.GITHUB_CLIENT_SECRET || "" },
  { key: "TELEGRAM_BOT_TOKEN", value: process.env.TELEGRAM_BOT_TOKEN || "" },
  { key: "BOT_USERNAME", value: process.env.BOT_USERNAME || "" },
];

const response = await fetch(`https://api.render.com/v1/services/${serviceId}/env-vars`, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(vars),
});

if (!response.ok) {
  throw new Error(`Env update failed: ${response.status} ${await response.text()}`);
}

console.log("Updated Render env vars for", serviceId);
console.log("BETTER_AUTH_URL=", serviceUrl);
