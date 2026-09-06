import { useCallback, useEffect, useState } from "react";
import type { Conversation, UserSummary } from "../../shared/types";
import { AccountLinks } from "./components/AccountLinks";
import { ChatWindow } from "./components/ChatWindow";
import { PasskeyButton } from "./components/PasskeyButton";
import { SignIn } from "./components/SignIn";
import { TelegramLink } from "./components/TelegramLink";
import { TelegramOtpForm } from "./components/TelegramOtpForm";
import { TwoFactorSetup } from "./components/TwoFactorSetup";
import { apiUrl, authClient } from "./lib/auth-client";
import { disconnectSocket, getSocket } from "./lib/socket";

type SessionUser = UserSummary;

export function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [people, setPeople] = useState<UserSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    try {
      const { data } = await Promise.race([
        authClient.getSession(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("session-timeout")), 4000);
        }),
      ]);
      if (!data?.user) {
        setUser(null);
        return;
      }
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        image: data.user.image ?? null,
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return;
    }
    getSocket().connect();
    void refreshConversations();
    void refreshPeople("");
  }, [user]);

  async function refreshConversations() {
    const response = await fetch(`${apiUrl}/conversations`, { credentials: "include" });
    if (!response.ok) {
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
      setError("Could not open that conversation");
      return;
    }
    const data = (await response.json()) as { conversation: Conversation };
    setSelectedId(data.conversation.id);
    await refreshConversations();
  }

  async function addPasskey() {
    const { error: nextError } = await authClient.passkey.addPasskey({
      name: "Relay device",
    });
    if (nextError) {
      setError(nextError.message ?? "Could not register passkey");
    }
  }

  async function signOut() {
    await authClient.signOut();
    disconnectSocket();
    setUser(null);
    setConversations([]);
    setSelectedId(null);
  }

  if (loading) {
    return (
      <main className="auth-screen">
        <p className="muted">Opening Relay…</p>
      </main>
    );
  }

  if (!user) {
    return <SignIn onAuthed={() => void loadSession()} />;
  }

  const selected = conversations.find((item) => item.id === selectedId) ?? null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <header className="sidebar-head">
          <div>
            <p className="kicker">Relay</p>
            <strong className="serif">Messages</strong>
          </div>
          <button className="ghost-btn" type="button" onClick={() => setSettingsOpen((open) => !open)}>
            {settingsOpen ? "Chats" : "Security"}
          </button>
        </header>
        {settingsOpen ? (
          <div className="settings-grid" style={{ padding: 16, overflow: "auto" }}>
            <AccountLinks />
            <section className="panel-card">
              <p className="kicker">Passkey</p>
              <h2>Register this device</h2>
              <p className="muted">Add a passkey so you can sign in without a password.</p>
              <div style={{ marginTop: 16 }}>
                <PasskeyButton label="Add passkey" onClick={() => void addPasskey()} />
              </div>
            </section>
            <TwoFactorSetup />
            <TelegramLink />
            <TelegramOtpForm />
          </div>
        ) : (
          <>
            <div style={{ padding: "0 16px 8px" }}>
              <label className="muted" htmlFor="people-search">
                Find someone
              </label>
              <input
                id="people-search"
                className="field"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  void refreshPeople(event.target.value);
                }}
                placeholder="Search name or email"
              />
            </div>
            <div className="conversation-list">
              {people.map((peer) => (
                <button
                  key={peer.id}
                  className="conversation-item"
                  type="button"
                  onClick={() => void startDirect(peer)}
                >
                  <strong>{peer.name}</strong>
                  <br />
                  <small>{peer.email}</small>
                </button>
              ))}
              {conversations.map((conversation) => {
                const peer = conversation.participants.find((item) => item.id !== user.id);
                return (
                  <button
                    key={conversation.id}
                    className="conversation-item"
                    data-active={String(conversation.id === selectedId)}
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                  >
                    <strong>{peer?.name ?? "Direct chat"}</strong>
                    <br />
                    <small>{conversation.lastMessage?.body ?? "No messages yet"}</small>
                  </button>
                );
              })}
            </div>
          </>
        )}
        <footer className="account-row">
          <div>
            <strong>{user.name}</strong>
            <br />
            <small>{user.email}</small>
          </div>
          <button className="ghost-btn" type="button" onClick={() => void signOut()}>
            Sign out
          </button>
        </footer>
      </aside>
      <main>
        {error ? <p className="banner" style={{ margin: 16 }}>{error}</p> : null}
        <ChatWindow conversation={selected} currentUser={user} />
      </main>
    </div>
  );
}
