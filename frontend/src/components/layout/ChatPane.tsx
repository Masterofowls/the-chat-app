import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import type { Conversation, PresencePayload, UserSummary } from "../../../../shared/types";
import { ChatWindow } from "../ChatWindow";
import { Avatar } from "../ui/Avatar";
import { UserPresence } from "../ui/UserPresence";

export type ChatOutletContext = {
  authed: true;
  user: UserSummary;
  conversations: Conversation[];
  presence: Record<string, PresencePayload>;
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

  return (
    <div className="chat-pane">
      {peer ? (
        <aside className="profile-rail" aria-label="Contact profile">
          <Avatar name={peer.name} image={peer.image} online={online} size="lg" />
          <h2 className="serif">{peer.name}</h2>
          <UserPresence
            isOnline={online}
            lastActiveAt={lastActive}
            deviceInfo={peer.deviceInfo}
          />
          <button
            className="ghost-btn"
            type="button"
            onClick={() => navigate(`/profile/${peer.id}`)}
          >
            Open profile
          </button>
        </aside>
      ) : null}
      <div className="chat-main">
        <ChatWindow
          conversation={selected}
          currentUser={user}
          peerPresence={{
            isOnline: online,
            lastActiveAt: lastActive,
            deviceInfo: peer?.deviceInfo ?? null,
          }}
          onOpenProfile={peer ? () => navigate(`/profile/${peer.id}`) : undefined}
        />
      </div>
      {!selected ? (
        <div className="empty-chat centered">
          <p className="kicker">Inbox</p>
          <h2 className="hero-title">Select a chat</h2>
          <p className="muted">Search for people on the left to start messaging.</p>
          <Link className="primary-btn" to="/settings">
            Open settings
          </Link>
        </div>
      ) : null}
    </div>
  );
}
