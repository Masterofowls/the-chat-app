import type { UserSummary } from "../../../shared/types.js";
import { isUserOnline } from "../presence.js";
import { parseDeviceInfo } from "../lib/device.js";

type UserRow = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  username?: string | null;
  customStatus?: string | null;
  lastActiveAt?: Date | null;
  showLastActive?: boolean | null;
  showDeviceInfo?: boolean | null;
  userAgent?: string | null;
};

export function toPublicUserSummary(row: UserRow, viewerId?: string): UserSummary {
  const isSelf = viewerId === row.id;
  const showLast = isSelf || row.showLastActive !== false;
  const showDevice = isSelf || row.showDeviceInfo !== false;

  return {
    id: row.id,
    name: row.name,
    email: isSelf ? row.email : "",
    image: row.image,
    username: row.username ?? null,
    customStatus: row.customStatus ?? null,
    isOnline: isUserOnline(row.id),
    lastActiveAt: showLast ? (row.lastActiveAt?.toISOString() ?? null) : null,
    deviceInfo: showDevice && row.userAgent ? parseDeviceInfo(row.userAgent) : null,
  };
}
