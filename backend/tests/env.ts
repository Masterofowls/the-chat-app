import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../.env");

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(filePath);
      return;
    } catch {
      // Fall through to manual parse for Jest / restricted runtimes.
    }
  }

  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(envPath);

process.env.NODE_ENV = "test";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-32";
process.env.BETTER_AUTH_URL ??= "http://localhost:9000";
process.env.CLIENT_ORIGIN ??= "http://localhost:9001";
process.env.RP_ID ??= "localhost";
process.env.GOOGLE_CLIENT_ID ??= "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET ??= "test-google-client-secret";
process.env.GITHUB_CLIENT_ID ??= "test-github-client-id";
process.env.GITHUB_CLIENT_SECRET ??= "test-github-client-secret";
