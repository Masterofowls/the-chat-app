import { NavLink, Outlet, useLocation, useNavigate, useOutletContext } from "react-router-dom";
import { settingsNavGroups } from "../../lib/settings-nav";
import type { ChatOutletContext } from "../layout/ChatPane";
import { ArrowLeftIcon } from "../icons/arrow-left";

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
          {isRoot ? <h1>Settings</h1> : <p className="settings-nav-title">Settings</p>}
        </header>
        <nav className="settings-links scroll-y">
          {settingsNavGroups.map((group) => (
            <div key={group.id} className="settings-group">
              {group.label ? <p className="list-section-label">{group.label}</p> : null}
              {group.items.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) => `settings-link${isActive ? " active" : ""}`}
                  >
                    <span className="settings-link-icon" data-tone={link.tone} aria-hidden="true">
                      <Icon size={16} strokeWidth={2.25} />
                    </span>
                    <span className="settings-link-label">{link.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
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
