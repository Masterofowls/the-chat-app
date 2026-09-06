import { useCallback, useEffect, useMemo, useState } from "react";
import type { Message, TypingPayload } from "../../../shared/types";
import { apiUrl } from "../lib/auth-client";
import { getSocket } from "../lib/socket";

type UseChatOptions = {
  conversationId: string | null;
};

export function useChat({ conversationId }: UseChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState<TypingPayload[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

  const sendMessage = useCallback(
    (body: string) => {
      if (!conversationId || !body.trim()) {
        return;
      }
      getSocket().emit("message:send", { conversationId, body: body.trim() });
    },
    [conversationId],
  );

  const startTyping = useCallback(() => {
    if (!conversationId) {
      return;
    }
    getSocket().emit("typing:start", { conversationId });
  }, [conversationId]);

  const stopTyping = useCallback(() => {
    if (!conversationId) {
      return;
    }
    getSocket().emit("typing:stop", { conversationId });
  }, [conversationId]);

  const typingLabel = useMemo(() => {
    if (typing.length === 0) {
      return "";
    }
    if (typing.length === 1) {
      return `${typing[0]?.userName ?? "Someone"} is typing`;
    }
    return "Several people are typing";
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
