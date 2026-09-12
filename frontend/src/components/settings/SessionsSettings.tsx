import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "../../lib/auth-client";
import { formatSessionDate, parseDeviceLabel } from "../../lib/format";

type SessionRow = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  current?: boolean;
};

export function SessionsSettings() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`${apiUrl}/me/sessions`, { credentials: "include" });
    if (!response.ok) {
      setError("Could not load sessions");
      return;
    }
    const data = (await response.json()) as { sessions: SessionRow[] };
    setSessions(data.sessions ?? []);
    setError(null);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function revoke(id: string) {
    setBusy(id);
    setError(null);
    const response = await fetch(`${apiUrl}/me/sessions/revoke`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setBusy(null);
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? "Could not revoke session");
      return;
    }
    await refresh();
  }

  return (
    <div className="settings-page">
      <p className="kicker">Security</p>
      <h2>Sessions</h2>
      <p className="muted">Devices currently signed in to Relay.</p>
      <ul className="session-list stack-form">
        {sessions.map((session) => {
          const isCurrent = Boolean(session.current);
          return (
            <li key={session.id} className="session-item">
              <div>
                <strong>{parseDeviceLabel(session.userAgent)}</strong>
                {isCurrent ? <span className="chip">This device</span> : null}
                <br />
                <small className="muted">
                  Started {formatSessionDate(String(session.createdAt))}
                  {session.ipAddress ? ` · ${session.ipAddress}` : ""}
                </small>
              </div>
              {!isCurrent ? (
                <button
                  className="ghost-btn"
                  type="button"
                  disabled={busy === session.id}
                  onClick={() => void revoke(session.id)}
                >
                  Log out
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {error ? <p className="banner">{error}</p> : null}
    </div>
  );
}
