import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env");
if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
}

process.env.NODE_ENV = "test";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-32";
process.env.BETTER_AUTH_URL ??= "http://localhost:9000";
process.env.CLIENT_ORIGIN ??= "http://localhost:9001";
process.env.RP_ID ??= "localhost";
process.env.GOOGLE_CLIENT_ID ??= "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET ??= "test-google-client-secret";
