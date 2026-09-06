import { useEffect, useState } from "react";
import { apiUrl } from "../lib/auth-client";

export function TelegramLink() {
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshStatus() {
    const response = await fetch(`${apiUrl}/telegram/status`, { credentials: "include" });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { linked: boolean };
    setLinked(data.linked);
  }

  useEffect(() => {
    void refreshStatus();
  }, []);

  async function generateLink() {
    setError(null);
    const response = await fetch(`${apiUrl}/telegram/link`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      setError("Could not create a Telegram link");
      return;
    }
    const data = (await response.json()) as { deepLink: string; linked: boolean };
    setDeepLink(data.deepLink);
    setLinked(data.linked);
    window.open(data.deepLink, "_blank", "noopener,noreferrer");
  }

  return (
    <section className="panel-card">
      <p className="kicker">Telegram</p>
      <h2>Link your bot</h2>
      <p className="muted">
        Relay opens <code>t.me/&lt;bot&gt;?start=&lt;token&gt;</code> and stores the chat id for OTP
        delivery.
      </p>
      <div className="stack" style={{ marginTop: 16 }}>
        <button className="primary-btn" type="button" onClick={() => void generateLink()}>
          {linked ? "Refresh Telegram link" : "Generate Telegram link"}
        </button>
        {deepLink ? (
          <a href={deepLink} target="_blank" rel="noreferrer">
            {deepLink}
          </a>
        ) : null}
        <p className="muted">{linked ? "Telegram is linked." : "Telegram is not linked yet."}</p>
        {error ? <p className="banner">{error}</p> : null}
      </div>
    </section>
  );
}
