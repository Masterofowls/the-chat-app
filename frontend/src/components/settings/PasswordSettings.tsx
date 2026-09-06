import { useState } from "react";
import { authClient } from "../../lib/auth-client";

export function PasswordSettings() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function changePassword() {
    setError(null);
    setMessage(null);
    const { error: nextError } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    if (nextError) {
      setError(nextError.message ?? "Could not change password");
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setMessage("Password updated. Other sessions were signed out.");
  }

  return (
    <div className="settings-page">
      <p className="kicker">Security</p>
      <h2 className="serif">Change password</h2>
      <div className="stack" style={{ marginTop: 20 }}>
        <label className="muted" htmlFor="current-password">
          Current password
        </label>
        <input
          id="current-password"
          className="field"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <label className="muted" htmlFor="new-password">
          New password
        </label>
        <input
          id="new-password"
          className="field"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <button className="primary-btn" type="button" onClick={() => void changePassword()}>
          Update password
        </button>
        {message ? <p className="banner success">{message}</p> : null}
        {error ? <p className="banner">{error}</p> : null}
      </div>
    </div>
  );
}
