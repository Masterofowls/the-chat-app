import { useState } from "react";
import { apiUrl } from "../lib/auth-client";

export function TelegramOtpForm() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const response = await fetch(`${apiUrl}/telegram/send`, {
      method: "POST",
      credentials: "include",
    });
    setBusy(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Could not send OTP");
      return;
    }
    setMessage("OTP sent to your linked Telegram chat.");
  }

  async function verifyCode() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const response = await fetch(`${apiUrl}/telegram/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setBusy(false);
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setError(data.error ?? "Verification failed");
      return;
    }
    setMessage("Telegram OTP verified.");
    setCode("");
  }

  return (
    <section className="panel-card">
      <p className="kicker">Telegram OTP</p>
      <h2>Confirm with Telegram</h2>
      <div className="stack" style={{ marginTop: 16 }}>
        <button className="ghost-btn" type="button" onClick={() => void sendCode()} disabled={busy}>
          Send OTP
        </button>
        <label className="muted" htmlFor="telegram-otp">
          6-digit code
        </label>
        <input
          id="telegram-otp"
          className="field"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
        <button className="primary-btn" type="button" onClick={() => void verifyCode()} disabled={busy}>
          Verify OTP
        </button>
        {message ? <p className="banner success">{message}</p> : null}
        {error ? <p className="banner">{error}</p> : null}
      </div>
    </section>
  );
}
