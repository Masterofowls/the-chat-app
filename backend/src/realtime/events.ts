export const SOCKET_EVENTS = {
  JOIN_CONVERSATION: "conversation:join",
  LEAVE_CONVERSATION: "conversation:leave",
  MESSAGE_SEND: "message:send",
  MESSAGE_NEW: "message:new",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  PRESENCE_PING: "presence:ping",
  PRESENCE_UPDATE: "presence:update",
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_ACK: "notification:ack",
  ERROR: "error",
} as const;

export function conversationRoom(conversationId: string): string {
  return `conversation:${conversationId}`;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}
