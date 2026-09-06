import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { authClient } from "../../lib/auth-client";

export function TwoFactorSettings() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const { data } = await authClient.getSession();
    const user = data?.user as { twoFactorEnabled?: boolean } | undefined;
    setEnabled(Boolean(user?.twoFactorEnabled));
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function enable() {
    setError(null);
    const { data, error: nextError } = await authClient.twoFactor.enable({
      password: password || undefined,
    });
    if (nextError || !data || !("totpURI" in data)) {
      setError(nextError?.message ?? "Could not start 2FA");
      return;
    }
    setTotpUri(data.totpURI);
    setBackupCodes(data.backupCodes ?? []);
  }

  async function verify() {
    setError(null);
    const { error: nextError } = await authClient.twoFactor.verifyTotp({ code });
    if (nextError) {
      setError(nextError.message ?? "Invalid code");
      return;
    }
    setMessage("Authenticator 2FA is enabled.");
    setTotpUri(null);
    await refresh();
  }

  async function disable() {
    setError(null);
    const { error: nextError } = await authClient.twoFactor.disable({
      password: password || undefined,
    });
    if (nextError) {
      setError(nextError.message ?? "Could not disable 2FA");
      return;
    }
    setMessage("Two-factor authentication disabled.");
    await refresh();
  }

  return (
    <div className="settings-page">
      <p className="kicker">Security</p>
      <h2 className="serif">Two-factor authentication</h2>
      <p className="muted">TOTP authenticator app protection for your Relay account.</p>
      <div className="stack" style={{ marginTop: 20 }}>
        <div className="session-item">
          <div>
            <strong>Authenticator app</strong>
            <br />
            <small className="muted">{enabled ? "Enabled" : "Not enabled"}</small>
          </div>
          {enabled ? (
            <button className="ghost-btn" type="button" onClick={() => void disable()}>
              Disable
            </button>
          ) : null}
        </div>
        <label className="muted" htmlFor="2fa-password">
          Password (required for password accounts)
        </label>
        <input
          id="2fa-password"
          className="field"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {!enabled ? (
          <>
            <button className="primary-btn" type="button" onClick={() => void enable()}>
              Set up authenticator
            </button>
            {totpUri ? (
              <div className="qr-wrap">
                <QRCodeSVG value={totpUri} size={180} />
              </div>
            ) : null}
            {backupCodes.length > 0 ? (
              <p className="muted">Backup codes: {backupCodes.join("  ")}</p>
            ) : null}
            {totpUri ? (
              <>
                <input
                  className="field"
                  inputMode="numeric"
                  placeholder="Authenticator code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
                <button className="primary-btn" type="button" onClick={() => void verify()}>
                  Confirm enrollment
                </button>
              </>
            ) : null}
          </>
        ) : null}
        {message ? <p className="banner success">{message}</p> : null}
        {error ? <p className="banner">{error}</p> : null}
      </div>
    </div>
  );
}
