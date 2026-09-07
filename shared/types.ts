export type UserSummary = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  username?: string | null;
  customStatus?: string | null;
  isOnline?: boolean;
  lastActiveAt?: string | null;
  deviceInfo?: string | null;
};

export type MessageReplyPreview = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
};

export type Conversation = {
  id: string;
  createdAt: string;
  updatedAt: string;
  participants: UserSummary[];
  lastMessage: Message | null;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  sender: UserSummary;
  replyToId?: string | null;
  replyTo?: MessageReplyPreview | null;
  mentions?: string[];
};

export type TypingPayload = {
  conversationId: string;
  userId: string;
  userName: string;
};

export type PresencePayload = {
  userId: string;
  isOnline: boolean;
  lastActiveAt: string | null;
};

export type NotificationType = "message" | "mention" | "reply";

export type NotificationPayload = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  conversationId: string;
  messageId: string;
  createdAt: string;
  fromUserId: string;
  fromUserName: string;
};

export type SocketErrorPayload = {
  code: string;
  message: string;
};

export type ClientToServerEvents = {
  "conversation:join": (payload: { conversationId: string }) => void;
  "conversation:leave": (payload: { conversationId: string }) => void;
  "message:send": (payload: {
    conversationId: string;
    body: string;
    replyToId?: string | null;
  }) => void;
  "typing:start": (payload: { conversationId: string }) => void;
  "typing:stop": (payload: { conversationId: string }) => void;
  "presence:ping": () => void;
  "notification:ack": (payload: { notificationId: string }) => void;
};

export type ServerToClientEvents = {
  "message:new": (payload: Message) => void;
  "typing:start": (payload: TypingPayload) => void;
  "typing:stop": (payload: TypingPayload) => void;
  "presence:update": (payload: PresencePayload) => void;
  "notification:new": (payload: NotificationPayload) => void;
  error: (payload: SocketErrorPayload) => void;
};

export type InterServerEvents = Record<string, never>;

export type SocketData = {
  user: UserSummary;
};

export type UserProfile = UserSummary & {
  customStatus: string | null;
  description: string | null;
  lastActiveAt: string | null;
  isOnline: boolean;
  deviceInfo: string | null;
  showLastActive: boolean;
  showDeviceInfo: boolean;
};
