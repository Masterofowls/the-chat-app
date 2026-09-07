import { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import type { Conversation, PresencePayload, UserSummary } from "../../../../shared/types";
import { MessageCircleIcon } from "../icons/message-circle";
import { MoonIcon } from "../icons/moon";
import { PanelLeftCloseIcon } from "../icons/panel-left-close";
import { PanelLeftOpenIcon } from "../icons/panel-left-open";
import { SearchIcon } from "../icons/search";
import { SettingsIcon } from "../icons/settings";
import { SunIcon } from "../icons/sun";
import { apiUrl } from "../../lib/auth-client";
import { E2E_CONVERSATIONS, E2E_PEER, isE2eMode } from "../../lib/e2e-fixtures";
import { NotificationToaster, NotificationsProvider, useNotifications } from "../../lib/notifications";
import { useTheme } from "../../lib/theme";
import { useApiHealth } from "../../lib/useApiHealth";
import { getSocket } from "../../lib/socket";
import { Avatar } from "../ui/Avatar";
import type { Message } from "../../../../shared/types";

type AppLayoutProps = {
  user: UserSummary;
  onSignedOut: () => void;
};

function formatConversationTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function AppLayout({ user, onSignedOut }: AppLayoutProps) {
  const params = useParams();
  return (
    <NotificationsProvider enabled activeConversationId={params.conversationId ?? null}>
      <AppLayoutInner user={user} onSignedOut={onSignedOut} />
      <NotificationToaster />
    </NotificationsProvider>
  );
}

function AppLayoutInner({ user, onSignedOut }: AppLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const connection = useApiHealth();
  const { unreadByConversation } = useNotifications();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [people, setPeople] = useState<UserSummary[]>([]);
  const [query, setQuery] = useState("");
  const [presence, setPresence] = useState<Record<string, PresencePayload>>({});
  const [error, setError] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const [booting, setBooting] = useState(true);
  const selectedId = params.conversationId ?? null;
  const inSettings =
    location.pathname.startsWith("/settings") ||
    location.pathname === "/me" ||
    location.pathname.startsWith("/profile/");
  const mobileChat = Boolean(selectedId) || inSettings;

  useEffect(() => {
    if (isE2eMode()) {
      setConversations(E2E_CONVERSATIONS);
      setPeople([E2E_PEER]);
      setBooting(false);
      setPresence({
        [E2E_PEER.id]: { userId: E2E_PEER.id, isOnline: true, lastActiveAt: null },
      });
      return;
    }

    const socket = getSocket();
    socket.connect();
    const onPresence = (payload: PresencePayload) => {
      setPresence((current) => ({ ...current, [payload.userId]: payload }));
    };
    const onMessage = (payload: Message) => {
      setConversations((current) => {
        const next = current.map((conversation) =>
          conversation.id === payload.conversationId
            ? {
                ...conversation,
                updatedAt: payload.createdAt,
                lastMessage: payload,
              }
            : conversation,
        );
        return [...next].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      });
    };
    socket.on("presence:update", onPresence);
    socket.on("message:new", onMessage);
    void (async () => {
      await Promise.all([refreshConversations(), refreshPeople("")]);
      setBooting(false);
    })();
    return () => {
      socket.off("presence:update", onPresence);
      socket.off("message:new", onMessage);
    };
  }, [user.id]);

  const title = useMemo(() => {
    if (connection !== "online") return "connecting…";
    return "Relay";
  }, [connection]);

  const conversationPeerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const conversation of conversations) {
      for (const participant of conversation.participants) {
        if (participant.id !== user.id) ids.add(participant.id);
      }
    }
    return ids;
  }, [conversations, user.id]);

  const peopleOnly = useMemo(
    () => people.filter((peer) => peer.id !== user.id && !conversationPeerIds.has(peer.id)),
    [people, user.id, conversationPeerIds],
  );

  async function refreshConversations() {
    const response = await fetch(`${apiUrl}/conversations`, { credentials: "include" });
    if (!response.ok) {
      if (isE2eMode()) {
        setConversations(E2E_CONVERSATIONS);
      }
      return;
    }
    const data = (await response.json()) as { conversations: Conversation[] };
    setConversations(data.conversations);
  }

  async function refreshPeople(q: string) {
    const response = await fetch(`${apiUrl}/conversations/users?q=${encodeURIComponent(q)}`, {
      credentials: "include",
    });
    if (!response.ok) {
      if (isE2eMode()) {
        setPeople([E2E_PEER]);
      }
      return;
    }
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
      if (isE2eMode()) {
        navigate(`/chat/${E2E_CONVERSATIONS[0]?.id ?? "e2e-conversation"}`);
        return;
      }
      setError("Could not open that conversation");
      return;
    }
    const data = (await response.json()) as { conversation: Conversation };
    await refreshConversations();
    navigate(`/chat/${data.conversation.id}`);
  }

  return (
    <div
      className="app-shell messenger"
      data-list-open={String(listOpen)}
      data-settings={String(inSettings)}
      data-mobile-chat={String(mobileChat)}
    >
      <aside className={`sidebar ${listOpen ? "open" : "collapsed"}`}>
        <header className="sidebar-head">
          <div className="brand-block">
            <MessageCircleIcon size={22} className="brand-icon" />
            <div>
              <strong className={`connection-title ${connection !== "online" ? "pulse" : ""}`}>
                {title}
              </strong>
              <p className="muted tiny">{user.name}</p>
            </div>
          </div>
          <div className="row tight">
            <button className="icon-btn" type="button" onClick={toggleTheme} aria-label="Toggle theme">
              {theme === "dark" ? <SunIcon size={20} /> : <MoonIcon size={20} />}
            </button>
            <Link className="icon-btn" to="/settings" aria-label="Settings">
              <SettingsIcon size={20} />
            </Link>
            <button
              className="icon-btn desktop-only"
              type="button"
              aria-label={listOpen ? "Collapse chat list" : "Expand chat list"}
              onClick={() => setListOpen((open) => !open)}
            >
              {listOpen ? <PanelLeftCloseIcon size={20} /> : <PanelLeftOpenIcon size={20} />}
            </button>
          </div>
        </header>

        <div className="sidebar-search">
          <SearchIcon size={16} className="search-glyph" />
          <input
            className="field search-field"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              void refreshPeople(event.target.value);
            }}
            placeholder="Search"
            aria-label="Search"
          />
        </div>

        <div className="conversation-list scroll-y">
          {booting ? (
            <div className="skeleton-stack">
              <div className="skeleton-row" />
              <div className="skeleton-row" />
              <div className="skeleton-row" />
            </div>
          ) : null}
          {!booting &&
            conversations.map((conversation) => {
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
                  <span className="conversation-meta">
                    <span className="conversation-top">
                      <strong>{peer?.name ?? "Direct chat"}</strong>
                      <span className="conversation-top-right">
                        {conversation.lastMessage ? (
                          <time
                            className="conversation-time"
                            dateTime={conversation.lastMessage.createdAt}
                          >
                            {formatConversationTime(conversation.lastMessage.createdAt)}
                          </time>
                        ) : null}
                        {(unreadByConversation[conversation.id] ?? 0) > 0 ? (
                          <span className="unread-badge">
                            {unreadByConversation[conversation.id]}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <small>
                      {conversation.lastMessage?.body ??
                        (online ? "Online" : lastActive ? "Recently active" : "No messages yet")}
                    </small>
                  </span>
                </button>
              );
            })}
          {!booting && peopleOnly.length > 0 && query.trim() ? (
            <>
              <p className="list-section-label">People</p>
              {peopleOnly.map((peer) => {
                const online = presence[peer.id]?.isOnline ?? peer.isOnline;
                return (
                  <button
                    key={`person-${peer.id}`}
                    className="conversation-item"
                    type="button"
                    onClick={() => void startDirect(peer)}
                  >
                    <Avatar name={peer.name} image={peer.image} online={online} size="md" />
                    <span className="conversation-meta">
                      <strong>{peer.name}</strong>
                      <small>{peer.customStatus || peer.username || "Start a chat"}</small>
                    </span>
                  </button>
                );
              })}
            </>
          ) : null}
        </div>

        <footer className="account-row">
          <Link to="/settings/profile" className="self-chip" title="Open your profile">
            <Avatar name={user.name} image={user.image} online size="md" />
          </Link>
        </footer>
      </aside>

      <main className="main-pane page-fade">
        {!listOpen ? (
          <button
            className="floating-expand desktop-only"
            type="button"
            aria-label="Expand chat list"
            onClick={() => setListOpen(true)}
          >
            <PanelLeftOpenIcon size={18} />
          </button>
        ) : null}
        {error ? <p className="banner soft">{error}</p> : null}
        <Outlet
          context={{
            authed: true as const,
            user,
            conversations,
            presence,
            refreshConversations,
            onSignedOut,
            startDirect,
          }}
        />
      </main>
    </div>
  );
}
