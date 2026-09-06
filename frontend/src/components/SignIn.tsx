import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import { PasskeyButton } from "./PasskeyButton";

type SignInProps = {
  onAuthed: () => void;
};

export function SignIn({ onAuthed }: SignInProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function signInGoogle() {
    setBusy(true);
    setError(null);
    const { error: nextError } = await authClient.signIn.social({
      provider: "google",
      callbackURL: window.location.origin,
    });
    setBusy(false);
    if (nextError) {
      setError(nextError.message ?? "Google sign-in failed");
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
        <h1>Sign in to Relay</h1>
        <p className="lede">
          Google, a device passkey, Telegram OTP, and authenticator 2FA — no SMS vendor.
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
              <button className="primary-btn" type="button" onClick={() => void signInGoogle()} disabled={busy}>
                Continue with Google
              </button>
              <PasskeyButton label="Sign in with passkey" onClick={() => void signInPasskey()} busy={busy} />
              <input
                className="field"
                autoComplete="username webauthn"
                placeholder="Email for passkey autofill"
                aria-label="Email for passkey autofill"
              />
            </>
          )}
          {error ? <p className="banner">{error}</p> : null}
        </div>
      </section>
    </main>
  );
}
