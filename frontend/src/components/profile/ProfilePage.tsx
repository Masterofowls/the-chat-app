import { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useNavigate, useParams } from "react-router-dom";
import type { UserProfile } from "../../../../shared/types";
import { apiUrl, authClient } from "../../lib/auth-client";
import { Avatar } from "../ui/Avatar";
import { UserPresence } from "../ui/UserPresence";
import { AvatarCropper } from "./AvatarCropper";

export function ProfilePage({ self = false }: { self?: boolean }) {
  const params = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  const userId = self ? "me" : params.userId;
  const shareUrl = useMemo(() => {
    if (!profile) return window.location.href;
    return `${window.location.origin}/profile/${profile.id}`;
  }, [profile]);

  useEffect(() => {
    void (async () => {
      setError(null);
      const path = self || userId === "me" ? "/me/profile" : `/users/${userId}/profile`;
      const response = await fetch(`${apiUrl}${path}`, { credentials: "include" });
      if (!response.ok) {
        setError("Could not load profile");
        return;
      }
      const data = (await response.json()) as { profile: UserProfile };
      setProfile(data.profile);
      setName(data.profile.name);
      setCustomStatus(data.profile.customStatus ?? "");
      setDescription(data.profile.description ?? "");
    })();
  }, [userId, self]);

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

  if (!profile) {
    return (
      <div className="settings-page">
        <p className="muted">{error || "Loading profile…"}</p>
      </div>
    );
  }

  const isSelf = self || profile.email.length > 0;

  return (
    <div className="profile-page">
      <button className="ghost-btn" type="button" onClick={() => navigate(-1)}>
        Back
      </button>
      <header className="profile-hero">
        <Avatar name={profile.name} image={profile.image} online={profile.isOnline} size="xl" />
        <div>
          <p className="kicker">{profile.username ? `@${profile.username}` : "Relay profile"}</p>
          <h1 className="serif">{profile.name}</h1>
          {profile.customStatus ? <p className="status-line">{profile.customStatus}</p> : null}
          <UserPresence
            isOnline={profile.isOnline}
            lastActiveAt={profile.lastActiveAt}
            deviceInfo={profile.deviceInfo}
          />
        </div>
      </header>
      {profile.description ? <p className="profile-bio">{profile.description}</p> : null}
      <div className="row" style={{ marginTop: 16 }}>
        <button className="primary-btn" type="button" onClick={() => void shareProfile()}>
          Share profile
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

      {isSelf ? (
        <div className="stack" style={{ marginTop: 28 }}>
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
        </div>
      ) : null}
      {message ? <p className="banner success">{message}</p> : null}
      {error ? <p className="banner">{error}</p> : null}
    </div>
  );
}
