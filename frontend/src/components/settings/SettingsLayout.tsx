import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/settings", end: true, label: "Overview" },
  { to: "/me", end: true, label: "Profile" },
  { to: "/settings/passkeys", label: "Passkeys" },
  { to: "/settings/accounts", label: "Connected accounts" },
  { to: "/settings/two-factor", label: "Two-factor" },
  { to: "/settings/sessions", label: "Sessions" },
  { to: "/settings/privacy", label: "Privacy" },
  { to: "/settings/password", label: "Password" },
  { to: "/settings/telegram", label: "Telegram" },
  { to: "/settings/danger", label: "Delete account" },
];

export function SettingsLayout() {
  return (
    <div className="settings-shell">
      <aside className="settings-nav" aria-label="Settings">
        <header className="settings-nav-head">
          <p className="kicker">Relay</p>
          <h1 className="serif">Settings</h1>
        </header>
        <nav className="settings-links">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `settings-link${isActive ? " active" : ""}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="settings-panel">
        <Outlet />
      </section>
    </div>
  );
}
