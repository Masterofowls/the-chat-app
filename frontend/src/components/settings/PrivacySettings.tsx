import { useEffect, useState } from "react";
import { apiUrl } from "../../lib/auth-client";

export function PrivacySettings() {
  const [showLastActive, setShowLastActive] = useState(true);
  const [showDeviceInfo, setShowDeviceInfo] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`${apiUrl}/me/profile`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as {
          profile: { showLastActive: boolean; showDeviceInfo: boolean };
        };
        setShowLastActive(data.profile.showLastActive);
        setShowDeviceInfo(data.profile.showDeviceInfo);
      })
      .catch(() => undefined);
  }, []);

  async function save() {
    setError(null);
    const response = await fetch(`${apiUrl}/me/profile`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showLastActive, showDeviceInfo }),
    });
    if (!response.ok) {
      setError("Could not save privacy settings");
      return;
    }
    setMessage("Privacy settings saved.");
  }

  return (
    <div className="settings-page">
      <p className="kicker">Privacy</p>
      <h2 className="serif">Visibility</h2>
      <p className="muted">Control what other people can see on your profile and in chats.</p>
      <div className="stack-form">
        <label className="toggle-row">
          <span>Show last active time</span>
          <span className="switch">
            <input
              type="checkbox"
              checked={showLastActive}
              onChange={(e) => setShowLastActive(e.target.checked)}
            />
            <span className="switch-ui" aria-hidden="true" />
          </span>
        </label>
        <label className="toggle-row">
          <span>Show device info</span>
          <span className="switch">
            <input
              type="checkbox"
              checked={showDeviceInfo}
              onChange={(e) => setShowDeviceInfo(e.target.checked)}
            />
            <span className="switch-ui" aria-hidden="true" />
          </span>
        </label>
        <button className="primary-btn" type="button" onClick={() => void save()}>
          Save
        </button>
        {message ? <p className="banner success">{message}</p> : null}
        {error ? <p className="banner">{error}</p> : null}
      </div>
    </div>
  );
}
