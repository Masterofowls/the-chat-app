import { Link } from "react-router-dom";

export function SettingsOverview() {
  return (
    <div className="settings-page">
      <p className="kicker">Relay</p>
      <h2 className="serif">Account settings</h2>
      <p className="muted">Manage security, privacy, connected logins, and your public profile.</p>
      <div className="settings-cards">
        <Link to="/me" className="settings-card">
          Profile & photo
        </Link>
        <Link to="/settings/passkeys" className="settings-card">
          Passkeys
        </Link>
        <Link to="/settings/accounts" className="settings-card">
          Connected accounts
        </Link>
        <Link to="/settings/two-factor" className="settings-card">
          Two-factor auth
        </Link>
        <Link to="/settings/sessions" className="settings-card">
          Sessions
        </Link>
        <Link to="/settings/privacy" className="settings-card">
          Privacy
        </Link>
      </div>
    </div>
  );
}
