import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "../../lib/auth-client";
import { disconnectSocket } from "../../lib/socket";

export function DangerSettings() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function deleteAccount() {
    if (confirm !== "DELETE") {
      setError('Type DELETE to confirm.');
      return;
    }
    setError(null);
    const { error: nextError } = await authClient.deleteUser({
      password: password || undefined,
    });
    if (nextError) {
      setError(nextError.message ?? "Could not delete account");
      return;
    }
    disconnectSocket();
    navigate("/", { replace: true });
    window.location.reload();
  }

  return (
    <div className="settings-page">
      <p className="kicker">Danger zone</p>
      <h2 className="serif">Delete account</h2>
      <p className="muted">This permanently removes your Relay account and chat memberships.</p>
      <div className="stack" style={{ marginTop: 20 }}>
        <input
          className="field"
          type="password"
          placeholder="Password (if you have one)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="field"
          placeholder='Type DELETE'
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <button className="danger-btn" type="button" onClick={() => void deleteAccount()}>
          Delete my account
        </button>
        {error ? <p className="banner">{error}</p> : null}
      </div>
    </div>
  );
}
