import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import { PasskeyButton } from "./PasskeyButton";

type SignInProps = {
  onAuthed: () => void;
};

type Mode = "signin" | "signup";

export function SignIn({ onAuthed }: SignInProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);

  useEffect(() => {
    const onRedirect = () => setNeedsTwoFactor(true);
    window.addEventListener("relay:two-factor", onRedirect);
    return () => window.removeEventListener("relay:two-factor", onRedirect);
  }, []);

  useEffect(() => {
    if (
      !window.PublicKeyCredential ||
      !PublicKeyCredential.isConditionalMediationAvailable
    ) {
      return;
    }

    void PublicKeyCredential.isConditionalMediationAvailable().then((available) => {
      if (available) {
        void authClient.signIn.passkey({ autoFill: true });
      }
    });
  }, []);

  async function signUp() {
    setBusy(true);
    setError(null);
    const { error: nextError } = await authClient.signUp.email({
      email: email.trim(),
      password,
      name: username.trim(),
      username: username.trim(),
    });
    setBusy(false);
    if (nextError) {
      setError(nextError.message ?? "Sign up failed");
      return;
    }
    onAuthed();
  }

  async function signInPassword() {
    setBusy(true);
    setError(null);
    const { error: nextError } = await authClient.signIn.username({
      username: username.trim(),
      password,
    });
    setBusy(false);
    if (nextError) {
      setError(nextError.message ?? "Sign in failed");
      return;
    }
    onAuthed();
  }

  async function signInSocial(provider: "google" | "github") {
    setBusy(true);
    setError(null);
    const { error: nextError } = await authClient.signIn.social({
      provider,
      callbackURL: window.location.origin,
    });
    setBusy(false);
    if (nextError) {
      setError(nextError.message ?? `${provider} sign-in failed`);
    }
  }

  async function signInPasskey() {
    setBusy(true);
    setError(null);
    const { error: nextError } = await authClient.signIn.passkey();
    setBusy(false);
    if (nextError) {
      setError(nextError.message ?? "Passkey sign-in failed");
      return;
    }
    onAuthed();
  }

  async function verifyTwoFactor() {
    setBusy(true);
    setError(null);
    const { error: nextError } = await authClient.twoFactor.verifyTotp({
      code: totp,
      trustDevice: true,
    });
    setBusy(false);
    if (nextError) {
      setError(nextError.message ?? "Invalid authenticator code");
      return;
    }
    onAuthed();
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <p className="kicker">Realtime messaging</p>
        <h1>{mode === "signup" ? "Create a Relay account" : "Sign in to Relay"}</h1>
        <p className="lede">
          Use a username and password, then link passkey, 2FA, Google, GitHub, or Telegram.
        </p>
        <div className="stack" style={{ marginTop: 24 }}>
          {needsTwoFactor ? (
            <>
              <label className="muted" htmlFor="totp">
                Authenticator code
              </label>
              <input
                id="totp"
                className="field"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={totp}
                onChange={(event) => setTotp(event.target.value)}
              />
              <button className="primary-btn" type="button" onClick={() => void verifyTwoFactor()}>
                Verify 2FA
              </button>
            </>
          ) : (
            <>
              <div className="auth-tabs" role="tablist" aria-label="Account mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signin"}
                  className="auth-tab"
                  data-active={String(mode === "signin")}
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "signup"}
                  className="auth-tab"
                  data-active={String(mode === "signup")}
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                >
                  Sign up
                </button>
              </div>

              <label className="muted" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className="field"
                autoComplete="username webauthn"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="relay-user"
              />

              {mode === "signup" ? (
                <>
                  <label className="muted" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    className="field"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                  />
                </>
              ) : null}

              <label className="muted" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="field"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
              />

              <button
                className="primary-btn"
                type="button"
                disabled={busy}
                onClick={() => void (mode === "signup" ? signUp() : signInPassword())}
              >
                {mode === "signup" ? "Create account" : "Sign in"}
              </button>

              <p className="muted" style={{ textAlign: "center", margin: "4px 0" }}>
                or continue with
              </p>
              <button
                className="ghost-btn"
                type="button"
                disabled={busy}
                onClick={() => void signInSocial("google")}
              >
                Google
              </button>
              <button
                className="ghost-btn"
                type="button"
                disabled={busy}
                onClick={() => void signInSocial("github")}
              >
                GitHub
              </button>
              <PasskeyButton
                label="Sign in with passkey"
                onClick={() => void signInPasskey()}
                busy={busy}
              />
            </>
          )}
          {error ? <p className="banner">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
