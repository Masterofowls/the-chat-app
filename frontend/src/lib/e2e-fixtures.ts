import type { Conversation, Message, UserProfile, UserSummary } from "../../../shared/types";

export const E2E_USER: UserSummary = {
  id: "e2e-user",
  name: "Relay Demo",
  email: "demo@relay.test",
  image: null,
  username: "relaydemo",
  isOnline: true,
};

export const E2E_PEER: UserSummary = {
  id: "e2e-peer",
  name: "Alice",
  email: "alice@relay.test",
  image: null,
  username: "alice",
  isOnline: true,
  customStatus: "hello",
};

const lastMessageAt = "2026-09-07T10:15:00.000Z";

export const E2E_MESSAGES: Message[] = [
  {
    id: "e2e-message-1",
    conversationId: "e2e-conversation",
    senderId: E2E_PEER.id,
    body: "Hey — welcome to Relay",
    createdAt: "2026-09-07T10:14:00.000Z",
    updatedAt: "2026-09-07T10:14:00.000Z",
    sender: E2E_PEER,
  },
  {
    id: "e2e-message-2",
    conversationId: "e2e-conversation",
    senderId: E2E_USER.id,
    body: "Thanks! Looks like Telegram.",
    createdAt: lastMessageAt,
    updatedAt: lastMessageAt,
    sender: E2E_USER,
  },
];

export const E2E_CONVERSATIONS: Conversation[] = [
  {
    id: "e2e-conversation",
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: lastMessageAt,
    participants: [E2E_USER, E2E_PEER],
    lastMessage: E2E_MESSAGES[0] ?? null,
  },
];

export const E2E_PROFILE: UserProfile = {
  ...E2E_USER,
  customStatus: "Building Relay",
  description: "Demo profile for visual tests",
  lastActiveAt: lastMessageAt,
  isOnline: true,
  deviceInfo: "Chrome on Windows",
  showLastActive: true,
  showDeviceInfo: true,
};

export function isE2eMode(): boolean {
  if (import.meta.env.VITE_E2E === "1") return true;
  try {
    return localStorage.getItem("relay-e2e") === "1";
  } catch {
    return false;
  }
}

export function enableE2eFromUrl(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("e2e") === "1") {
      localStorage.setItem("relay-e2e", "1");
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}
