import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envPath = path.join(root, ".env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const required = ["DATABASE_URL", "BETTER_AUTH_SECRET"];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing ${key} in backend/.env`);
  }
}

const args = [
  "services",
  "create",
  "--name",
  "messaging-app-api",
  "--type",
  "web_service",
  "--repo",
  "https://github.com/Masterofowls/the-chat-app",
  "--branch",
  "main",
  "--runtime",
  "node",
  "--root-directory",
  "backend",
  "--build-command=npm run build",
  "--start-command=npm start",
  "--health-check-path",
  "/health",
  "--plan",
  "starter",
  "--region",
  "frankfurt",
  "--env-var=NODE_ENV=production",
  `--env-var=DATABASE_URL=${process.env.DATABASE_URL}`,
  `--env-var=BETTER_AUTH_SECRET=${process.env.BETTER_AUTH_SECRET}`,
  "--env-var=CLIENT_ORIGIN=http://localhost:9001",
  "--env-var=RP_ID=localhost",
  "--confirm",
  "--output",
  "json",
];

const result = spawnSync("render", args, {
  encoding: "utf8",
  shell: false,
  windowsVerbatimArguments: false,
  maxBuffer: 10 * 1024 * 1024,
});

if (result.stdout) {
  process.stdout.write(result.stdout);
}
if (result.stderr) {
  process.stderr.write(result.stderr);
}
process.exit(result.status ?? 1);
