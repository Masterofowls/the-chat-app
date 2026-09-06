export type UserSummary = {
  id: string;
  name: string;
  email: string;
  image: string | null;
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
};

export type ServerToClientEvents = {
  "message:new": (payload: Message) => void;
  "typing:start": (payload: TypingPayload) => void;
  "typing:stop": (payload: TypingPayload) => void;
  error: (payload: SocketErrorPayload) => void;
};

export type InterServerEvents = Record<string, never>;

export type SocketData = {
  user: UserSummary;
};
