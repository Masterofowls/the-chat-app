import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Conversation, Message, UserSummary } from "../../../shared/types";
import { useChat } from "../hooks/useChat";
import { useNotifications } from "../lib/notifications";
import { ArrowLeftIcon } from "./icons/arrow-left";
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
  onOpenProfile?: (userId?: string) => void;
  onBack?: () => void;
};

function formatBubbleTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function renderBody(
  body: string,
  people: UserSummary[],
  onOpenProfile?: (userId?: string) => void,
) {
  const parts = body.split(/(@[a-zA-Z0-9_]{2,32})/g);
  return parts.map((part, index) => {
    if (!part.startsWith("@")) {
      return <span key={`${index}-${part.slice(0, 8)}`}>{part}</span>;
    }
    const handle = part.slice(1).toLowerCase();
    const person = people.find((user) => {
      const username = user.username?.toLowerCase() ?? "";
      const compactName = user.name.replace(/\s+/g, "").toLowerCase();
      return username === handle || compactName === handle;
    });
    if (person && onOpenProfile) {
      return (
        <button
          key={`${part}-${index}`}
          type="button"
          className={styles.mention}
          onClick={() => onOpenProfile(person.id)}
        >
          {part}
        </button>
      );
    }
    return (
      <span key={`${part}-${index}`} className={styles.mention}>
        {part}
      </span>
    );
  });
}

export function ChatWindow({
  conversation,
  currentUser,
  peerPresence,
  onOpenProfile,
  onBack,
}: ChatWindowProps) {
  const { messages, typingLabel, connected, loading, error, sendMessage, startTyping, stopTyping } =
    useChat({ conversationId: conversation?.id ?? null });
  const { clearConversation } = useNotifications();
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const peer = conversation?.participants.find((user) => user.id !== currentUser.id);

  const mentionCandidates = useMemo(() => {
    if (!conversation || !mentionOpen) return [];
    const q = mentionQuery.toLowerCase();
    return conversation.participants
      .filter((user) => user.id !== currentUser.id)
      .filter((user) => {
        const username = user.username?.toLowerCase() ?? "";
        const name = user.name.toLowerCase();
        return !q || username.includes(q) || name.includes(q);
      });
  }, [conversation, currentUser.id, mentionOpen, mentionQuery]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, typingLabel]);

  useEffect(() => {
    if (conversation?.id) {
      clearConversation(conversation.id);
    }
  }, [clearConversation, conversation?.id, messages.length]);

  if (!conversation || !peer) {
    return null;
  }

  function updateDraft(value: string) {
    setDraft(value);
    const cursor = inputRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, cursor);
    const match = before.match(/@([a-zA-Z0-9_]*)$/);
    if (match) {
      setMentionOpen(true);
      setMentionQuery(match[1] ?? "");
    } else {
      setMentionOpen(false);
      setMentionQuery("");
    }
    startTyping();
  }

  function insertMention(user: UserSummary) {
    const handle = user.username || user.name.replace(/\s+/g, "").toLowerCase();
    const cursor = inputRef.current?.selectionStart ?? draft.length;
    const before = draft.slice(0, cursor).replace(/@([a-zA-Z0-9_]*)$/, `@${handle} `);
    const after = draft.slice(cursor);
    setDraft(`${before}${after}`);
    setMentionOpen(false);
    setMentionQuery("");
    inputRef.current?.focus();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    sendMessage(draft, { replyToId: replyTo?.id ?? null });
    setDraft("");
    setReplyTo(null);
    setMentionOpen(false);
    stopTyping();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit(event);
    }
    if (event.key === "Escape") {
      setReplyTo(null);
      setMentionOpen(false);
    }
  }

  return (
    <section className={styles.window} aria-label={`Conversation with ${peer.name}`}>
      <header className="chat-top">
        {onBack ? (
          <button
            type="button"
            className={`icon-btn mobile-only ${styles.backBtn}`}
            onClick={onBack}
            aria-label="Back to chats"
          >
            <ArrowLeftIcon size={20} />
          </button>
        ) : null}
        <button type="button" className="chat-peer" onClick={() => onOpenProfile?.(peer.id)}>
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
        <span
          className={`status-dot ${styles.liveDot}`}
          data-on={String(connected)}
          title={connected ? "Connected" : "Reconnecting"}
          aria-label={connected ? "Connected" : "Reconnecting"}
        />
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
        {messages.map((message) => {
          const mine = message.senderId === currentUser.id;
          return (
            <article
              key={message.id}
              className={`${styles.bubble} ${mine ? styles.mine : ""}`}
              id={`msg-${message.id}`}
            >
              {message.replyTo ? (
                <button
                  type="button"
                  className={styles.replyQuote}
                  onClick={() => {
                    document
                      .getElementById(`msg-${message.replyTo?.id}`)
                      ?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                >
                  <strong>{message.replyTo.senderName}</strong>
                  <span>{message.replyTo.body}</span>
                </button>
              ) : null}
              <div className={styles.body}>
                {renderBody(message.body, conversation.participants, onOpenProfile)}
              </div>
              <footer className={styles.bubbleFoot}>
                <button
                  type="button"
                  className={styles.replyBtn}
                  aria-label="Reply"
                  onClick={() => {
                    setReplyTo(message);
                    inputRef.current?.focus();
                  }}
                >
                  Reply
                </button>
                <time className={styles.time} dateTime={message.createdAt}>
                  {formatBubbleTime(message.createdAt)}
                </time>
              </footer>
            </article>
          );
        })}
        <div ref={endRef} />
      </div>
      <p className={styles.typing} aria-live="polite">
        {typingLabel ? (
          <>
            <span className={styles.typingDots} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            {typingLabel}
          </>
        ) : null}
      </p>
      {replyTo ? (
        <div className={styles.replyBar}>
          <div>
            <strong>Reply to {replyTo.sender.name}</strong>
            <span>{replyTo.body}</span>
          </div>
          <button type="button" className="ghost-btn" onClick={() => setReplyTo(null)}>
            Cancel
          </button>
        </div>
      ) : null}
      <form className={styles.composer} onSubmit={onSubmit}>
        <label className="visually-hidden" htmlFor="message-input">
          Message
        </label>
        <div className={styles.composerMain}>
          {mentionOpen && mentionCandidates.length > 0 ? (
            <ul className={styles.mentionMenu} role="listbox">
              {mentionCandidates.map((user) => (
                <li key={user.id}>
                  <button type="button" onClick={() => insertMention(user)}>
                    <Avatar name={user.name} image={user.image} size="sm" showStatus={false} />
                    <span>
                      <strong>{user.name}</strong>
                      <small>@{user.username || "user"}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <textarea
            id="message-input"
            ref={inputRef}
            className={`field ${styles.input}`}
            value={draft}
            onChange={(event) => updateDraft(event.target.value)}
            onKeyDown={onKeyDown}
            onBlur={() => stopTyping()}
            rows={1}
            placeholder={replyTo ? "Write a reply… Use @username to ping" : "Message — try @username"}
          />
        </div>
        <button className={styles.sendBtn} type="submit" aria-label="Send">
          <span aria-hidden="true">Send</span>
        </button>
      </form>
    </section>
  );
}
