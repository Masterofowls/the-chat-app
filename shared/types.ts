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

export type SocketErrorPayload = {
  code: string;
  message: string;
};

export type ClientToServerEvents = {
  "conversation:join": (payload: { conversationId: string }) => void;
  "conversation:leave": (payload: { conversationId: string }) => void;
  "message:send": (payload: { conversationId: string; body: string }) => void;
  "typing:start": (payload: { conversationId: string }) => void;
  "typing:stop": (payload: { conversationId: string }) => void;
  "presence:ping": () => void;
};

export type ServerToClientEvents = {
  "message:new": (payload: Message) => void;
  "typing:start": (payload: TypingPayload) => void;
  "typing:stop": (payload: TypingPayload) => void;
  "presence:update": (payload: PresencePayload) => void;
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
