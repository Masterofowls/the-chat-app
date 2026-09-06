import { useCallback, useEffect, useState } from "react";
import { authClient } from "../../lib/auth-client";
import { formatSessionDate, parseDeviceLabel } from "../../lib/format";

type SessionRow = {
  id: string;
  token: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
  userAgent?: string | null;
  ipAddress?: string | null;
};

export function SessionsSettings() {
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [sessionRes, listRes] = await Promise.all([
      authClient.getSession(),
      authClient.listSessions(),
    ]);
    setCurrentToken(sessionRes.data?.session?.token ?? null);
    if (listRes.error) {
      setError(listRes.error.message ?? "Could not load sessions");
      return;
    }
    setSessions((listRes.data ?? []) as SessionRow[]);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function revoke(token: string) {
    setBusy(token);
    setError(null);
    const { error: nextError } = await authClient.revokeSession({ token });
    setBusy(null);
    if (nextError) {
      setError(nextError.message ?? "Could not revoke session");
      return;
    }
    await refresh();
  }

  return (
    <div className="settings-page">
      <p className="kicker">Security</p>
      <h2 className="serif">Sessions</h2>
      <p className="muted">Devices currently signed in to Relay.</p>
      <ul className="session-list" style={{ marginTop: 20 }}>
        {sessions.map((session) => {
          const isCurrent = session.token === currentToken;
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
                  disabled={busy === session.token}
                  onClick={() => void revoke(session.token)}
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
