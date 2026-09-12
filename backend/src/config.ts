import "./load-env.js";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

const localOrigins = [
  "http://localhost:9001",
  "http://127.0.0.1:9001",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const configuredOrigins = optional("CLIENT_ORIGIN")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const isProduction = process.env.NODE_ENV === "production";
export const isTest = process.env.NODE_ENV === "test";

export const allowedOrigins = [
  ...new Set([
    ...localOrigins,
    ...configuredOrigins,
    ...(isProduction
      ? ["https://messaging-app-frontend-five.vercel.app", "https://*.vercel.app"]
      : []),
  ]),
];

export function isAllowedBrowserOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export const env = {
  get DATABASE_URL() {
    return required("DATABASE_URL");
  },
  get BETTER_AUTH_SECRET() {
    return optional(
      "BETTER_AUTH_SECRET",
      isTest ? "test-secret-test-secret-test-secret-32" : "",
    ) || required("BETTER_AUTH_SECRET");
  },
  get BETTER_AUTH_URL() {
    return optional("BETTER_AUTH_URL", "http://localhost:9000");
  },
  get CLIENT_ORIGIN() {
    return optional("CLIENT_ORIGIN", "http://localhost:9001");
  },
  get GOOGLE_CLIENT_ID() {
    return optional("GOOGLE_CLIENT_ID", isTest ? "test-google-client-id" : "");
  },
  get GOOGLE_CLIENT_SECRET() {
    return optional("GOOGLE_CLIENT_SECRET", isTest ? "test-google-client-secret" : "");
  },
  get GITHUB_CLIENT_ID() {
    return optional("GITHUB_CLIENT_ID", isTest ? "test-github-client-id" : "");
  },
  get GITHUB_CLIENT_SECRET() {
    return optional("GITHUB_CLIENT_SECRET", isTest ? "test-github-client-secret" : "");
  },
  get TELEGRAM_BOT_TOKEN() {
    return optional("TELEGRAM_BOT_TOKEN");
  },
  get BOT_USERNAME() {
    return optional("BOT_USERNAME");
  },
  get RP_ID() {
    return optional("RP_ID", "localhost");
  },
  get NODE_ENV() {
    return optional("NODE_ENV", "development");
  },
  get PORT() {
    return Number(optional("PORT", "9000"));
  },
};

export function getEnv(name: keyof typeof env): string | number {
  return env[name];
}
