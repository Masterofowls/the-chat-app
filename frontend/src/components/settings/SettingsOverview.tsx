import { Link } from "react-router-dom";
import { settingsNavGroups } from "../../lib/settings-nav";

export function SettingsOverview() {
  return (
    <div className="settings-page">
      <h2>Preferences</h2>
      <p className="muted settings-lede">
        Security, privacy, and the profile other people see.
      </p>
      {settingsNavGroups.map((group) => (
        <div key={group.id} className="settings-block">
          {group.label ? <p className="list-section-label">{group.label}</p> : null}
          <div className="tg-list">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.to} to={item.to} className="tg-row">
                  <span className="tg-row-icon" data-tone={item.tone} aria-hidden="true">
                    <Icon size={18} strokeWidth={2.25} />
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
      ))}
    </div>
  );
}
