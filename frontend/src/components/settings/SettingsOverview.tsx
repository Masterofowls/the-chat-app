import { Link } from "react-router-dom";
import { UserIcon } from "../icons/user";
import { SettingsIcon } from "../icons/settings";
import { WifiIcon } from "../icons/wifi";
import { LogoutIcon } from "../icons/logout";

const items = [
  { to: "/me", label: "My profile", hint: "Photo, status, share", icon: UserIcon },
  { to: "/settings/passkeys", label: "Passkeys", hint: "Devices & authenticators", icon: SettingsIcon },
  { to: "/settings/accounts", label: "Connected accounts", hint: "Google, GitHub, Telegram", icon: WifiIcon },
  { to: "/settings/two-factor", label: "Two-factor", hint: "Authenticator app", icon: SettingsIcon },
  { to: "/settings/sessions", label: "Sessions", hint: "Active devices", icon: WifiIcon },
  { to: "/settings/privacy", label: "Privacy", hint: "Last seen & device", icon: UserIcon },
  { to: "/settings/password", label: "Password", hint: "Change password", icon: SettingsIcon },
  { to: "/settings/telegram", label: "Telegram OTP", hint: "Bot linking", icon: WifiIcon },
  { to: "/settings/danger", label: "Delete account", hint: "Permanent", icon: LogoutIcon },
];

export function SettingsOverview() {
  return (
    <div className="settings-page">
      <h2>Settings</h2>
      <p className="muted">Manage security, privacy, and your public profile.</p>
      <div className="tg-list" style={{ marginTop: 16 }}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className="tg-row">
              <span className="tg-row-icon">
                <Icon size={18} />
              </span>
              <span className="tg-row-text">
                <strong>{item.label}</strong>
                <small>{item.hint}</small>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
