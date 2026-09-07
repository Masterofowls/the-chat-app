import { NavLink, Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import type { ChatOutletContext } from "../layout/ChatPane";
import { ArrowLeftIcon } from "../icons/arrow-left";
import { LogoutIcon } from "../icons/logout";
import { SettingsIcon } from "../icons/settings";
import { UserIcon } from "../icons/user";
import { WifiIcon } from "../icons/wifi";

const links = [
  { to: "/settings/profile", label: "My profile", icon: UserIcon },
  { to: "/settings/passkeys", label: "Passkeys", icon: SettingsIcon },
  { to: "/settings/accounts", label: "Connected accounts", icon: WifiIcon },
  { to: "/settings/two-factor", label: "Two-factor", icon: SettingsIcon },
  { to: "/settings/sessions", label: "Sessions", icon: WifiIcon },
  { to: "/settings/privacy", label: "Privacy", icon: UserIcon },
  { to: "/settings/password", label: "Password", icon: SettingsIcon },
  { to: "/settings/telegram", label: "Telegram", icon: WifiIcon },
  { to: "/settings/danger", label: "Delete account", icon: LogoutIcon },
];

export function SettingsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const outletContext = useOutletContext<ChatOutletContext>();
  const isRoot = location.pathname === "/settings";

  return (
    <div className="settings-shell telegram-settings" data-root={String(isRoot)}>
      <aside className="settings-nav" aria-label="Settings">
        <header className="settings-nav-head">
          <button className="ghost-btn back-btn" type="button" onClick={() => navigate("/")}>
            <ArrowLeftIcon size={18} />
            Chats
          </button>
          <h1>Settings</h1>
        </header>
        <nav className="settings-links scroll-y">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `settings-link${isActive ? " active" : ""}`}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <section className="settings-panel">
        {!isRoot ? (
          <button
            className="ghost-btn back-btn panel-back mobile-only"
            type="button"
            onClick={() => navigate("/settings")}
          >
            <ArrowLeftIcon size={18} />
            Settings
          </button>
        ) : null}
        <div className="settings-panel-body scroll-y">
          <Outlet context={outletContext} />
        </div>
      </section>
    </div>
  );
}
