import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useParams } from "react-router-dom";
import type { Conversation, PresencePayload, UserSummary } from "../../../../shared/types";
import { apiUrl, authClient } from "../../lib/auth-client";
import { useTheme } from "../../lib/theme";
import { disconnectSocket, getSocket } from "../../lib/socket";
import { Avatar } from "../ui/Avatar";
import { UserPresence } from "../ui/UserPresence";

type AppLayoutProps = {
  user: UserSummary;
  onSignedOut: () => void;
};

export function AppLayout({ user, onSignedOut }: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const params = useParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [people, setPeople] = useState<UserSummary[]>([]);
  const [query, setQuery] = useState("");
  const [presence, setPresence] = useState<Record<string, PresencePayload>>({});
  const [error, setError] = useState<string | null>(null);
  const selectedId = params.conversationId ?? null;

  useEffect(() => {
    const socket = getSocket();
    socket.connect();
    const onPresence = (payload: PresencePayload) => {
      setPresence((current) => ({ ...current, [payload.userId]: payload }));
    };
    socket.on("presence:update", onPresence);
    void refreshConversations();
    void refreshPeople("");
    return () => {
      socket.off("presence:update", onPresence);
    };
  }, [user.id]);

  async function refreshConversations() {
    const response = await fetch(`${apiUrl}/conversations`, { credentials: "include" });
    if (!response.ok) return;
    const data = (await response.json()) as { conversations: Conversation[] };
    setConversations(data.conversations);
  }

  async function refreshPeople(q: string) {
    const response = await fetch(`${apiUrl}/conversations/users?q=${encodeURIComponent(q)}`, {
      credentials: "include",
    });
    if (!response.ok) return;
    const data = (await response.json()) as { users: UserSummary[] };
    setPeople(data.users);
  }

  async function startDirect(peer: UserSummary) {
    setError(null);
    const response = await fetch(`${apiUrl}/conversations/direct`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: peer.id }),
    });
    if (!response.ok) {
      setError("Could not open that conversation");
      return;
    }
    const data = (await response.json()) as { conversation: Conversation };
    await refreshConversations();
    navigate(`/chat/${data.conversation.id}`);
  }

  async function signOut() {
    await authClient.signOut();
    disconnectSocket();
    onSignedOut();
  }

  return (
    <div className="app-shell messenger">
      <aside className="sidebar">
        <header className="sidebar-head">
          <div className="row">
            <Link to="/me" className="avatar-link" title="Your profile">
              <Avatar name={user.name} image={user.image} online size="md" />
            </Link>
            <div>
              <p className="kicker">Relay</p>
              <strong className="serif">{user.name}</strong>
            </div>
          </div>
          <div className="row">
            <button className="icon-btn" type="button" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <Link className="icon-btn" to="/settings" aria-label="Settings">
              ⚙
            </Link>
          </div>
        </header>
        <div className="sidebar-search">
          <input
            className="field"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              void refreshPeople(event.target.value);
            }}
            placeholder="Search people or chats"
            aria-label="Search"
          />
        </div>
        <div className="conversation-list">
          {people.map((peer) => {
            const online = presence[peer.id]?.isOnline ?? peer.isOnline;
            return (
              <button
                key={`person-${peer.id}`}
                className="conversation-item"
                type="button"
                onClick={() => void startDirect(peer)}
              >
                <Avatar name={peer.name} image={peer.image} online={online} size="md" />
                <span>
                  <strong>{peer.name}</strong>
                  <br />
                  <small>{peer.customStatus || peer.username || "Start a chat"}</small>
                </span>
              </button>
            );
          })}
          {conversations.map((conversation) => {
            const peer = conversation.participants.find((item) => item.id !== user.id);
            const online = peer ? (presence[peer.id]?.isOnline ?? peer.isOnline) : false;
            const lastActive = peer
              ? (presence[peer.id]?.lastActiveAt ?? peer.lastActiveAt)
              : null;
            return (
              <button
                key={conversation.id}
                className="conversation-item"
                data-active={String(conversation.id === selectedId)}
                type="button"
                onClick={() => navigate(`/chat/${conversation.id}`)}
              >
                <Avatar
                  name={peer?.name ?? "Chat"}
                  image={peer?.image}
                  online={online}
                  size="md"
                />
                <span>
                  <strong>{peer?.name ?? "Direct chat"}</strong>
                  <br />
                  <small>
                    {conversation.lastMessage?.body ??
                      (online ? "Online" : lastActive ? "Recently active" : "No messages yet")}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
        <footer className="account-row">
          <div>
            <strong>{user.name}</strong>
            <UserPresence isOnline compact />
          </div>
          <button className="ghost-btn" type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </footer>
      </aside>
      <main className="main-pane">
        {error ? <p className="banner" style={{ margin: 16 }}>{error}</p> : null}
        <Outlet
          context={{
            authed: true as const,
            user,
            conversations,
            presence,
            refreshConversations,
          }}
        />
      </main>
    </div>
  );
}
