import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Conversation, UserSummary } from "../../../shared/types";
import { useChat } from "../hooks/useChat";
import { Avatar } from "./ui/Avatar";
import { UserPresence } from "./ui/UserPresence";
import styles from "./ChatWindow.module.css";

type ChatWindowProps = {
  conversation: Conversation | null;
  currentUser: UserSummary;
  peerPresence?: {
    isOnline?: boolean | null;
    lastActiveAt?: string | null;
    deviceInfo?: string | null;
  };
  onOpenProfile?: () => void;
};

export function ChatWindow({
  conversation,
  currentUser,
  peerPresence,
  onOpenProfile,
}: ChatWindowProps) {
  const { messages, typingLabel, connected, loading, error, sendMessage, startTyping, stopTyping } =
    useChat({ conversationId: conversation?.id ?? null });
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const peer = conversation?.participants.find((user) => user.id !== currentUser.id);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingLabel]);

  if (!conversation || !peer) {
    return null;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    sendMessage(draft);
    setDraft("");
    stopTyping();
  }

  return (
    <section className={styles.window} aria-label={`Conversation with ${peer.name}`}>
      <header className="chat-top">
        <button type="button" className="chat-peer" onClick={onOpenProfile}>
          <Avatar
            name={peer.name}
            image={peer.image}
            online={peerPresence?.isOnline ?? peer.isOnline}
            size="md"
          />
          <span>
            <strong>{peer.name}</strong>
            <UserPresence
              compact
              isOnline={peerPresence?.isOnline ?? peer.isOnline}
              lastActiveAt={peerPresence?.lastActiveAt ?? peer.lastActiveAt}
              deviceInfo={peerPresence?.deviceInfo ?? peer.deviceInfo}
            />
          </span>
        </button>
        <div className="row tight">
          <span className="status-dot" data-on={String(connected)} aria-hidden="true" />
          <span className="muted tiny">{connected ? "Live" : "Reconnecting"}</span>
        </div>
      </header>
      <div className={`${styles.thread} scroll-y`} ref={threadRef}>
        {loading ? (
          <div className="skeleton-stack chat-skel">
            <div className="skeleton-bubble" />
            <div className="skeleton-bubble mine" />
            <div className="skeleton-bubble" />
          </div>
        ) : null}
        {error ? <p className="banner soft">{error}</p> : null}
        {messages.map((message) => (
          <article
            key={message.id}
            className={`${styles.bubble} ${message.senderId === currentUser.id ? styles.mine : ""}`}
          >
            <span className={styles.meta}>
              {message.sender.name} · {new Date(message.createdAt).toLocaleTimeString()}
            </span>
            {message.body}
          </article>
        ))}
        <div ref={endRef} />
      </div>
      <p className={styles.typing} aria-live="polite">
        {typingLabel}
      </p>
      <form className={styles.composer} onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor="message-input">
          Message
        </label>
        <textarea
          id="message-input"
          className={`field ${styles.input}`}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            startTyping();
          }}
          onBlur={() => stopTyping()}
          rows={1}
          placeholder="Message"
        />
        <button className="primary-btn" type="submit">
          Send
        </button>
      </form>
    </section>
  );
}
