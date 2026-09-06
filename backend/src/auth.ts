import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor, username } from "better-auth/plugins";
import { allowedOrigins, env, isProduction } from "./config.js";
import { db } from "./db/index.js";
import * as schema from "./db/schema.js";

const cookieAttributes = {
  sameSite: isProduction ? ("none" as const) : ("lax" as const),
  secure: isProduction,
  httpOnly: true,
};

export const auth = betterAuth({
  appName: "Relay",
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  trustedOrigins: allowedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github"],
      allowDifferentEmails: true,
    },
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID || "missing-google-client-id",
      clientSecret: env.GOOGLE_CLIENT_SECRET || "missing-google-client-secret",
    },
    github: {
      clientId: env.GITHUB_CLIENT_ID || "missing-github-client-id",
      clientSecret: env.GITHUB_CLIENT_SECRET || "missing-github-client-secret",
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    defaultCookieAttributes: cookieAttributes,
    cookies: {
      session_token: {
        attributes: cookieAttributes,
      },
    },
    useSecureCookies: isProduction,
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 32,
    }),
    twoFactor({
      issuer: "Relay",
      allowPasswordless: true,
    }),
    passkey({
      rpID: env.RP_ID,
      rpName: "Relay",
      origin: env.CLIENT_ORIGIN,
    }),
  ],
});
