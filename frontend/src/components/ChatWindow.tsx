import { useEffect, useRef, useState, type FormEvent } from "react";
import type { Conversation, UserSummary } from "../../../shared/types";
import { useChat } from "../hooks/useChat";
import styles from "./ChatWindow.module.css";

type ChatWindowProps = {
  conversation: Conversation | null;
  currentUser: UserSummary;
};

export function ChatWindow({ conversation, currentUser }: ChatWindowProps) {
  const { messages, typingLabel, connected, loading, error, sendMessage, startTyping, stopTyping } =
    useChat({ conversationId: conversation?.id ?? null });
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const peer = conversation?.participants.find((user) => user.id !== currentUser.id);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!conversation) {
    return (
      <section className="empty-chat" style={{ placeItems: "center", minHeight: "100vh" }}>
        <div>
          <p className="kicker">Inbox</p>
          <h2 className="hero-title">Choose someone to message</h2>
          <p className="muted">Direct conversations stay in one room. Typing and delivery are live.</p>
        </div>
      </section>
    );
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    sendMessage(draft);
    setDraft("");
    stopTyping();
  }

  return (
    <section className={styles.window} aria-label={`Conversation with ${peer?.name ?? "peer"}`}>
      <header className="chat-top">
        <div>
          <p className="kicker">Direct</p>
          <h2 className="serif" style={{ margin: 0 }}>
            {peer?.name ?? "Conversation"}
          </h2>
        </div>
        <div className="row">
          <span className="status-dot" data-on={String(connected)} aria-hidden="true" />
          <span className="muted">{connected ? "Live" : "Reconnecting"}</span>
        </div>
      </header>
      <div className={styles.thread}>
        {loading ? <p className="muted">Loading history…</p> : null}
        {error ? <p className="banner">{error}</p> : null}
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
          rows={1}
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            if (event.target.value) {
              startTyping();
            } else {
              stopTyping();
            }
          }}
          onBlur={stopTyping}
          placeholder={`Message ${peer?.name ?? "them"}`}
        />
        <button className="primary-btn" type="submit">
          Send
        </button>
      </form>
    </section>
  );
}
