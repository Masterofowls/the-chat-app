import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Conversation, PresencePayload, UserSummary } from "../../../shared/types";
import { apiUrl, authClient } from "./auth-client";
import { disconnectSocket, getSocket, pingPresence, subscribePresence } from "./socket";

export type SessionUser = UserSummary & {
  twoFactorEnabled?: boolean;
};

type SessionContextValue = {
  user: SessionUser;
  conversations: Conversation[];
  people: UserSummary[];
  presence: Record<string, PresencePayload>;
  refreshSession: () => Promise<void>;
  refreshConversations: () => Promise<void>;
  refreshPeople: (query: string) => Promise<void>;
  startDirect: (peer: UserSummary) => Promise<string | null>;
  signOut: () => Promise<void>;
  setUser: (user: SessionUser) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

type SessionProviderProps = {
  user: SessionUser;
  onSignedOut: () => void;
  children: ReactNode;
};

function applyPresence(
  users: UserSummary[],
  presence: Record<string, PresencePayload>,
): UserSummary[] {
  return users.map((item) => {
    const update = presence[item.id];
    if (!update) {
      return item;
    }
    return {
      ...item,
      isOnline: update.isOnline,
      lastActiveAt: update.lastActiveAt,
    };
  });
}

export function SessionProvider({ user: initialUser, onSignedOut, children }: SessionProviderProps) {
  const [user, setUser] = useState<SessionUser>(initialUser);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [people, setPeople] = useState<UserSummary[]>([]);
  const [presence, setPresence] = useState<Record<string, PresencePayload>>({});

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const refreshSession = useCallback(async () => {
    const { data } = await authClient.getSession();
    if (!data?.user) {
      onSignedOut();
      return;
    }
    const next = data.user as SessionUser & {
      image?: string | null;
      twoFactorEnabled?: boolean;
    };
    setUser({
      id: next.id,
      name: next.name,
      email: next.email,
      image: next.image ?? null,
      username: next.username ?? null,
      customStatus: next.customStatus ?? null,
      isOnline: true,
      lastActiveAt: next.lastActiveAt ? String(next.lastActiveAt) : null,
      twoFactorEnabled: Boolean(next.twoFactorEnabled),
    });
  }, [onSignedOut]);

  const refreshConversations = useCallback(async () => {
    const response = await fetch(`${apiUrl}/conversations`, { credentials: "include" });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { conversations: Conversation[] };
    setConversations(data.conversations);
  }, []);

  const refreshPeople = useCallback(async (query: string) => {
    const response = await fetch(
      `${apiUrl}/conversations/users?q=${encodeURIComponent(query)}`,
      { credentials: "include" },
    );
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { users: UserSummary[] };
    setPeople(data.users);
  }, []);

  const startDirect = useCallback(async (peer: UserSummary) => {
    const response = await fetch(`${apiUrl}/conversations/direct`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: peer.id }),
    });
    if (!response.ok) {
      return null;
    }
    const data = (await response.json()) as { conversation: Conversation };
    await refreshConversations();
    return data.conversation.id;
  }, [refreshConversations]);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    disconnectSocket();
    onSignedOut();
  }, [onSignedOut]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }
    void refreshConversations();
    void refreshPeople("");
    const interval = window.setInterval(() => pingPresence(), 30_000);
    const unsubscribe = subscribePresence((payload) => {
      setPresence((current) => ({ ...current, [payload.userId]: payload }));
    });
    return () => {
      window.clearInterval(interval);
      unsubscribe();
    };
  }, [refreshConversations, refreshPeople]);

  const enrichedConversations = useMemo(
    () =>
      conversations.map((conversation) => ({
        ...conversation,
        participants: applyPresence(conversation.participants, presence),
      })),
    [conversations, presence],
  );

  const enrichedPeople = useMemo(
    () => applyPresence(people, presence),
    [people, presence],
  );

  const value = useMemo(
    () => ({
      user,
      conversations: enrichedConversations,
      people: enrichedPeople,
      presence,
      refreshSession,
      refreshConversations,
      refreshPeople,
      startDirect,
      signOut,
      setUser,
    }),
    [
      user,
      enrichedConversations,
      enrichedPeople,
      presence,
      refreshSession,
      refreshConversations,
      refreshPeople,
      startDirect,
      signOut,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
