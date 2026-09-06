import { formatLastActive } from "../../lib/format";

type UserPresenceProps = {
  isOnline?: boolean | null;
  lastActiveAt?: string | null;
  deviceInfo?: string | null;
  compact?: boolean;
};

export function UserPresence({
  isOnline,
  lastActiveAt,
  deviceInfo,
  compact = false,
}: UserPresenceProps) {
  const status = isOnline ? "Online" : formatLastActive(lastActiveAt);
  return (
    <div className={compact ? "presence compact" : "presence"}>
      <span className="presence-status">{status}</span>
      {deviceInfo ? <span className="presence-device">{deviceInfo}</span> : null}
    </div>
  );
}
