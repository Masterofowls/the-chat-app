const onlineUsers = new Map<string, number>();

export function markOnline(userId: string): void {
  onlineUsers.set(userId, (onlineUsers.get(userId) ?? 0) + 1);
}

export function markOffline(userId: string): boolean {
  const current = onlineUsers.get(userId) ?? 0;
  if (current <= 1) {
    onlineUsers.delete(userId);
    return true;
  }
  onlineUsers.set(userId, current - 1);
  return false;
}

export function isUserOnline(userId: string): boolean {
  return (onlineUsers.get(userId) ?? 0) > 0;
}
