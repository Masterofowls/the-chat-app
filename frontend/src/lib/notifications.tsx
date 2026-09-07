import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import type { NotificationPayload } from "../../../shared/types";
import { isE2eMode } from "./e2e-fixtures";
import { getSocket } from "./socket";

type NotificationsContextValue = {
  items: NotificationPayload[];
  unreadByConversation: Record<string, number>;
  permission: NotificationPermission | "unsupported";
  requestPermission: () => Promise<void>;
  dismiss: (id: string) => void;
  clearConversation: (conversationId: string) => void;
  toast: NotificationPayload | null;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function canUseBrowserNotifications() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function NotificationsProvider({
  children,
  enabled,
  activeConversationId,
}: {
  children: ReactNode;
  enabled: boolean;
  activeConversationId: string | null;
}) {
  const navigate = useNavigate();
  const [items, setItems] = useState<NotificationPayload[]>([]);
  const [toast, setToast] = useState<NotificationPayload | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    canUseBrowserNotifications() ? Notification.permission : "unsupported",
  );

  const pushLocal = useCallback(
    (payload: NotificationPayload) => {
      if (payload.conversationId === activeConversationId && document.visibilityState === "visible") {
        return;
      }
      setItems((current) => [payload, ...current].slice(0, 40));
      setToast(payload);
      window.setTimeout(() => {
        setToast((current) => (current?.id === payload.id ? null : current));
      }, 4200);

      if (
        canUseBrowserNotifications() &&
        Notification.permission === "granted" &&
        document.visibilityState === "hidden"
      ) {
        const note = new Notification(payload.title, {
          body: payload.body,
          tag: payload.messageId,
        });
        note.onclick = () => {
          window.focus();
          navigate(`/chat/${payload.conversationId}`);
          note.close();
        };
      }
    },
    [activeConversationId, navigate],
  );

  useEffect(() => {
    if (!enabled || isE2eMode()) return;
    const socket = getSocket();
    const onNotify = (payload: NotificationPayload) => pushLocal(payload);
    socket.on("notification:new", onNotify);
    if (!socket.connected) socket.connect();
    return () => {
      socket.off("notification:new", onNotify);
    };
  }, [enabled, pushLocal]);

  const requestPermission = useCallback(async () => {
    if (!canUseBrowserNotifications()) {
      setPermission("unsupported");
      return;
    }
    const next = await Notification.requestPermission();
    setPermission(next);
  }, []);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
    setToast((current) => (current?.id === id ? null : current));
  }, []);

  const clearConversation = useCallback((conversationId: string) => {
    setItems((current) => current.filter((item) => item.conversationId !== conversationId));
  }, []);

  const unreadByConversation = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.conversationId] = (counts[item.conversationId] ?? 0) + 1;
    }
    return counts;
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      unreadByConversation,
      permission,
      requestPermission,
      dismiss,
      clearConversation,
      toast,
    }),
    [items, unreadByConversation, permission, requestPermission, dismiss, clearConversation, toast],
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const value = useContext(NotificationsContext);
  if (!value) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return value;
}

export function NotificationToaster() {
  const { toast, dismiss, permission, requestPermission } = useNotifications();
  const navigate = useNavigate();

  return (
    <div className="notify-layer" aria-live="polite">
      {permission === "default" ? (
        <button
          type="button"
          className="notify-permission"
          onClick={() => void requestPermission()}
        >
          Enable desktop notifications
        </button>
      ) : null}
      {toast ? (
        <button
          type="button"
          className="notify-toast"
          data-type={toast.type}
          onClick={() => {
            dismiss(toast.id);
            navigate(`/chat/${toast.conversationId}`);
          }}
        >
          <strong>{toast.title}</strong>
          <span>{toast.body}</span>
        </button>
      ) : null}
    </div>
  );
}
