import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Message, TypingPayload } from "../../../shared/types";
import { apiUrl } from "../lib/auth-client";
import { E2E_MESSAGES, isE2eMode } from "../lib/e2e-fixtures";
import { getSocket } from "../lib/socket";

type UseChatOptions = {
  conversationId: string | null;
};

type SendOptions = {
  replyToId?: string | null;
};

export function useChat({ conversationId }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState<TypingPayload[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const typingTimer = useRef<number | null>(null);
  const typingActive = useRef(false);

  useEffect(() => {
    if (isE2eMode()) {
      setConnected(true);
      return;
    }

    const socket = getSocket();

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onMessage = (payload: Message) => {
      if (payload.conversationId !== conversationId) {
        return;
      }
      setMessages((current) =>
        current.some((item) => item.id === payload.id) ? current : [...current, payload],
      );
    };
    const onTypingStart = (payload: TypingPayload) => {
      if (payload.conversationId !== conversationId) {
        return;
      }
      setTyping((current) =>
        current.some((item) => item.userId === payload.userId) ? current : [...current, payload],
      );
    };
    const onTypingStop = (payload: TypingPayload) => {
      setTyping((current) => current.filter((item) => item.userId !== payload.userId));
    };
    const onError = (payload: { message: string }) => {
      setError(payload.message);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message:new", onMessage);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("error", onError);

    if (!socket.connected) {
      socket.connect();
    } else {
      setConnected(true);
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message:new", onMessage);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("error", onError);
    };
  }, [conversationId]);

  useEffect(() => {
    const socket = getSocket();
    setTyping([]);
    setError(null);

    if (!conversationId) {
      setMessages([]);
      return;
    }

    if (isE2eMode() && conversationId === "e2e-conversation") {
      setMessages(E2E_MESSAGES);
      setConnected(true);
      setLoading(false);
      return;
    }

    socket.emit("conversation:join", { conversationId });

    let cancelled = false;
    setLoading(true);

    void fetch(`${apiUrl}/conversations/${conversationId}/messages`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Could not load messages");
        }
        const data = (await response.json()) as { messages: Message[] };
        if (!cancelled) {
          setMessages(data.messages);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load messages");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      socket.emit("conversation:leave", { conversationId });
    };
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (!conversationId || isE2eMode()) {
      typingActive.current = false;
      return;
    }
    if (typingTimer.current) {
      window.clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }
    if (typingActive.current) {
      getSocket().emit("typing:stop", { conversationId });
      typingActive.current = false;
    }
  }, [conversationId]);

  const startTyping = useCallback(() => {
    if (!conversationId || isE2eMode()) return;
    if (!typingActive.current) {
      getSocket().emit("typing:start", { conversationId });
      typingActive.current = true;
    }
    if (typingTimer.current) {
      window.clearTimeout(typingTimer.current);
    }
    typingTimer.current = window.setTimeout(() => {
      stopTyping();
    }, 1800);
  }, [conversationId, stopTyping]);

  const sendMessage = useCallback(
    (body: string, options?: SendOptions) => {
      if (!conversationId || !body.trim()) {
        return;
      }
      if (isE2eMode()) {
        const now = new Date().toISOString();
        const replyTo =
          options?.replyToId != null
            ? (E2E_MESSAGES.find((item) => item.id === options.replyToId) ?? null)
            : null;
        setMessages((current) => [
          ...current,
          {
            id: `e2e-local-${Date.now()}`,
            conversationId,
            senderId: "e2e-user",
            body: body.trim(),
            createdAt: now,
            updatedAt: now,
            replyToId: replyTo?.id ?? null,
            replyTo: replyTo
              ? {
                  id: replyTo.id,
                  body: replyTo.body,
                  senderId: replyTo.senderId,
                  senderName: replyTo.sender.name,
                }
              : null,
            mentions: [],
            sender: {
              id: "e2e-user",
              name: "Relay Demo",
              email: "demo@relay.test",
              image: null,
              username: "relaydemo",
              isOnline: true,
            },
          },
        ]);
        return;
      }
      getSocket().emit("message:send", {
        conversationId,
        body: body.trim(),
        replyToId: options?.replyToId ?? null,
      });
      stopTyping();
    },
    [conversationId, stopTyping],
  );

  useEffect(() => () => stopTyping(), [stopTyping]);

  const typingLabel = useMemo(() => {
    if (typing.length === 0) {
      return "";
    }
    if (typing.length === 1) {
      return `${typing[0]?.userName ?? "Someone"} is typing…`;
    }
    return "Several people are typing…";
  }, [typing]);

  return {
    messages,
    typing,
    typingLabel,
    connected,
    loading,
    error,
    sendMessage,
    startTyping,
    stopTyping,
  };
}
