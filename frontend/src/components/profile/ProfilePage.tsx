import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import type { UserProfile } from "../../../../shared/types";
import { apiUrl, authClient } from "../../lib/auth-client";
import { ArrowLeftIcon } from "../icons/arrow-left";
import { LogoutIcon } from "../icons/logout";
import { SettingsIcon } from "../icons/settings";
import { Avatar } from "../ui/Avatar";
import { UserPresence } from "../ui/UserPresence";
import { AvatarCropper } from "./AvatarCropper";
import type { ChatOutletContext } from "../layout/ChatPane";

export function ProfilePage({ self = false }: { self?: boolean }) {
  const params = useParams();
  const navigate = useNavigate();
  const { user, onSignedOut, startDirect } = useOutletContext<ChatOutletContext>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const userId = self ? "me" : params.userId;
  const shareUrl = useMemo(() => {
    if (!profile) return window.location.href;
    return `${window.location.origin}/profile/${profile.id}`;
  }, [profile]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      const path = self || userId === "me" ? "/me/profile" : `/users/${userId}/profile`;
      const response = await fetch(`${apiUrl}${path}`, { credentials: "include" });
      if (!response.ok) {
        setError("Could not load profile");
        setLoading(false);
        return;
      }
      const data = (await response.json()) as { profile: UserProfile };
      setProfile(data.profile);
      setName(data.profile.name);
      setCustomStatus(data.profile.customStatus ?? "");
      setDescription(data.profile.description ?? "");
      setLoading(false);
    })();
  }, [userId, self]);

  const isSelf = self || profile?.id === user.id;

  async function saveProfile() {
    const response = await fetch(`${apiUrl}/me/profile`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        customStatus: customStatus || null,
        description: description || null,
      }),
    });
    if (!response.ok) {
      setError("Could not save profile");
      return;
    }
    const data = (await response.json()) as { profile: UserProfile };
    setProfile(data.profile);
    setMessage("Profile updated.");
    await authClient.getSession();
  }

  async function shareProfile() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${profile?.name} on Relay`,
          text: profile?.customStatus || profile?.description || "Chat with me on Relay",
          url: shareUrl,
        });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setMessage("Profile link copied.");
    } catch {
      setError("Share cancelled or unavailable");
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
      onSignedOut();
      navigate("/", { replace: true });
    } catch {
      setError("Could not sign out");
      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <div className="profile-page page-fade">
        <div className="skeleton-stack">
          <div className="skeleton-hero" />
          <div className="skeleton-row" />
          <div className="skeleton-row" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page page-fade">
        <button className="ghost-btn back-btn" type="button" onClick={() => navigate(-1)}>
          <ArrowLeftIcon size={18} />
          Back
        </button>
        <p className="muted">{error || "Profile not found"}</p>
      </div>
    );
  }

  return (
    <div className={`profile-page page-fade ${isSelf ? "self" : "guest"}`}>
      <header className="profile-toolbar">
        <button className="ghost-btn back-btn" type="button" onClick={() => navigate(-1)}>
          <ArrowLeftIcon size={18} />
          Back
        </button>
        {isSelf ? (
          <Link className="ghost-btn back-btn" to="/settings">
            <SettingsIcon size={18} />
            Settings
          </Link>
        ) : null}
      </header>

      <div className="profile-card">
        <div className="profile-hero-stack">
          <Avatar name={profile.name} image={profile.image} online={profile.isOnline} size="xl" />
          <p className="kicker">{profile.username ? `@${profile.username}` : "Relay"}</p>
          <h1 className="serif">{profile.name}</h1>
          {profile.customStatus ? <p className="status-line">{profile.customStatus}</p> : null}
          <UserPresence
            isOnline={profile.isOnline}
            lastActiveAt={profile.lastActiveAt}
            deviceInfo={isSelf ? profile.deviceInfo : profile.deviceInfo}
          />
        </div>

        {profile.description ? <p className="profile-bio">{profile.description}</p> : null}

        <div className="row wrap" style={{ marginTop: 16, justifyContent: "center" }}>
          {!isSelf ? (
            <button
              className="primary-btn"
              type="button"
              onClick={() =>
                void startDirect({
                  id: profile.id,
                  name: profile.name,
                  email: profile.email,
                  image: profile.image,
                  username: profile.username,
                  isOnline: profile.isOnline,
                })
              }
            >
              Message
            </button>
          ) : null}
          <button className="primary-btn" type="button" onClick={() => void shareProfile()}>
            Share
          </button>
          <button className="ghost-btn" type="button" onClick={() => setShowQr((v) => !v)}>
            {showQr ? "Hide QR" : "QR code"}
          </button>
        </div>

        {showQr ? (
          <div className="qr-wrap" style={{ marginTop: 16 }}>
            <QRCodeSVG value={shareUrl} size={180} />
            <p className="muted">{shareUrl}</p>
          </div>
        ) : null}
      </div>

      {isSelf ? (
        <div className="profile-card stack" style={{ marginTop: 16 }}>
          <h2 className="serif">Edit profile</h2>
          <AvatarCropper
            onSaved={(image) => setProfile((current) => (current ? { ...current, image } : current))}
          />
          <label className="muted" htmlFor="profile-name">
            Display name
          </label>
          <input
            id="profile-name"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="muted" htmlFor="profile-status">
            Custom status
          </label>
          <input
            id="profile-status"
            className="field"
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            maxLength={80}
          />
          <label className="muted" htmlFor="profile-bio">
            Description
          </label>
          <textarea
            id="profile-bio"
            className="field"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
          <button className="primary-btn" type="button" onClick={() => void saveProfile()}>
            Save profile
          </button>
          <button
            className="danger-btn sign-out-btn"
            type="button"
            disabled={signingOut}
            onClick={() => void signOut()}
          >
            <LogoutIcon size={18} />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      ) : (
        <div className="profile-card" style={{ marginTop: 16 }}>
          <p className="muted">
            This is a public Relay profile. Presence and device details respect their privacy
            settings.
          </p>
        </div>
      )}

      {message ? <p className="banner success">{message}</p> : null}
      {error ? <p className="banner">{error}</p> : null}
    </div>
  );
}
