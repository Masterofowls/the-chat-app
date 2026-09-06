import { useCallback, useEffect, useState } from "react";
import { authClient } from "../../lib/auth-client";
import { PasskeyButton } from "../PasskeyButton";

type PasskeyRow = {
  id: string;
  name?: string | null;
  createdAt?: string | Date | null;
  deviceType?: string | null;
};

export function PasskeysSettings() {
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error: nextError } = await authClient.passkey.listUserPasskeys();
    if (nextError) {
      setError(nextError.message ?? "Could not load passkeys");
      return;
    }
    setPasskeys((data ?? []) as PasskeyRow[]);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addPasskey() {
    setBusy(true);
    setError(null);
    const { error: nextError } = await authClient.passkey.addPasskey({ name: "Relay device" });
    setBusy(false);
    if (nextError) {
      setError(nextError.message ?? "Could not add passkey");
      return;
    }
    await refresh();
  }

  async function removePasskey(id: string) {
    setBusy(true);
    setError(null);
    const { error: nextError } = await authClient.passkey.deletePasskey({ id });
    setBusy(false);
    if (nextError) {
      setError(nextError.message ?? "Could not remove passkey");
      return;
    }
    await refresh();
  }

  return (
    <div className="settings-page">
      <p className="kicker">Security</p>
      <h2 className="serif">Passkeys</h2>
      <p className="muted">Registered authenticators on this account.</p>
      <div className="stack" style={{ marginTop: 20 }}>
        <PasskeyButton label="Add passkey" onClick={() => void addPasskey()} busy={busy} />
        {passkeys.length === 0 ? <p className="muted">No passkeys yet.</p> : null}
        <ul className="session-list">
          {passkeys.map((passkey) => (
            <li key={passkey.id} className="session-item">
              <div>
                <strong>{passkey.name || "Unnamed passkey"}</strong>
                <br />
                <small className="muted">
                  {passkey.deviceType || "device"} ·{" "}
                  {passkey.createdAt
                    ? new Date(passkey.createdAt).toLocaleString()
                    : "Unknown date"}
                </small>
              </div>
              <button
                className="ghost-btn"
                type="button"
                disabled={busy}
                onClick={() => void removePasskey(passkey.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
        {error ? <p className="banner">{error}</p> : null}
      </div>
    </div>
  );
}
