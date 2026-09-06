import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { authClient } from "../lib/auth-client";

export function TwoFactorSetup() {
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  async function enable() {
    setError(null);
    const { data, error: nextError } = await authClient.twoFactor.enable({});
    if (nextError || !data || !("totpURI" in data)) {
      setError(nextError?.message ?? "Could not start 2FA enrollment");
      return;
    }
    setTotpUri(data.totpURI);
    setBackupCodes(data.backupCodes ?? []);
  }

  async function verify() {
    setError(null);
    const { error: nextError } = await authClient.twoFactor.verifyTotp({ code });
    if (nextError) {
      setError(nextError.message ?? "That code did not match");
      return;
    }
    setReady(true);
  }

  return (
    <section className="panel-card">
      <p className="kicker">Authenticator</p>
      <h2>Set up TOTP 2FA</h2>
      <div className="stack" style={{ marginTop: 16 }}>
        <button className="ghost-btn" type="button" onClick={() => void enable()}>
          Generate QR code
        </button>
        {totpUri ? (
          <div className="row" style={{ justifyContent: "center", padding: 12, background: "#fff", borderRadius: 20 }}>
            <QRCodeSVG value={totpUri} size={180} />
          </div>
        ) : null}
        {backupCodes.length > 0 ? (
          <p className="muted">Backup codes: {backupCodes.join("  ")}</p>
        ) : null}
        <label className="muted" htmlFor="enroll-totp">
          Code from your authenticator
        </label>
        <input
          id="enroll-totp"
          className="field"
          inputMode="numeric"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <button className="primary-btn" type="button" onClick={() => void verify()}>
          Confirm enrollment
        </button>
        {ready ? <p className="banner success">Two-factor authentication is on.</p> : null}
        {error ? <p className="banner">{error}</p> : null}
      </div>
    </section>
  );
}
