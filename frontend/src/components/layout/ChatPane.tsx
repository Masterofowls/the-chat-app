import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { Conversation, PresencePayload, UserSummary } from "../../../../shared/types";
import { ChatWindow } from "../ChatWindow";
import { ArrowLeftIcon } from "../icons/arrow-left";
import { MessageCircleIcon } from "../icons/message-circle";

export type ChatOutletContext = {
  authed: true;
  user: UserSummary;
  conversations: Conversation[];
  presence: Record<string, PresencePayload>;
  refreshConversations: () => Promise<void>;
  onSignedOut: () => void;
  startDirect: (peer: UserSummary) => Promise<void>;
  refreshUser: (patch: Partial<UserSummary>) => void;
};

export function ChatPane() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user, conversations, presence } = useOutletContext<ChatOutletContext>();
  const selected = conversations.find((item) => item.id === conversationId) ?? null;
  const peer = selected?.participants.find((item) => item.id !== user.id);
  const online = peer ? (presence[peer.id]?.isOnline ?? peer.isOnline) : false;
  const lastActive = peer
    ? (presence[peer.id]?.lastActiveAt ?? peer.lastActiveAt)
    : null;

  if (!selected || !peer) {
    return (
      <div className="empty-chat centered">
        {conversationId ? (
          <button
            className="ghost-btn back-btn"
            type="button"
            aria-label="Back to chats"
            onClick={() => navigate("/")}
          >
            <ArrowLeftIcon size={18} />
            Back to chats
          </button>
        ) : null}
        <MessageCircleIcon size={40} className="brand-icon" />
        <p className="muted">
          {conversationId ? "This chat isn't available" : "Select a chat to start messaging"}
        </p>
      </div>
    );
  }

  return (
    <div className="chat-pane">
      <div className="chat-main">
        <ChatWindow
          conversation={selected}
          currentUser={user}
          peerPresence={{
            isOnline: online,
            lastActiveAt: lastActive,
            deviceInfo: peer.deviceInfo,
          }}
          onOpenProfile={(userId) => navigate(`/profile/${userId ?? peer.id}`)}
          onBack={() => navigate("/")}
        />
      </div>
    </div>
  );
}
