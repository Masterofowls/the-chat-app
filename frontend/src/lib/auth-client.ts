import { passkeyClient } from "@better-auth/passkey/client";
import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:9000";

export const authClient = createAuthClient({
  baseURL: apiUrl,
  plugins: [
    passkeyClient(),
    twoFactorClient({
      onTwoFactorRedirect() {
        window.dispatchEvent(new CustomEvent("relay:two-factor"));
      },
    }),
  ],
});
