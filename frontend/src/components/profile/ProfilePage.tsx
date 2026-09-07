import { useEffect, useMemo, useState } from "react";
import { useNavigate, useOutletContext, useParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import type { UserProfile } from "../../../../shared/types";
import { E2E_PEER, E2E_PROFILE, isE2eMode } from "../../lib/e2e-fixtures";
import { apiUrl, authClient } from "../../lib/auth-client";
import { useDocumentMeta } from "../../lib/seo";
import { ArrowLeftIcon } from "../icons/arrow-left";
import { LogoutIcon } from "../icons/logout";
import { Avatar } from "../ui/Avatar";
import { UserPresence } from "../ui/UserPresence";
import { AvatarCropper } from "./AvatarCropper";
import type { ChatOutletContext } from "../layout/ChatPane";

function seedSelfProfile(user: ChatOutletContext["user"]): UserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    username: user.username ?? null,
    customStatus: user.customStatus ?? null,
    description: null,
    lastActiveAt: user.lastActiveAt ?? null,
    isOnline: true,
    deviceInfo: null,
    showLastActive: true,
    showDeviceInfo: true,
  };
}

export function ProfilePage({ self = false }: { self?: boolean }) {
  const params = useParams();
  const navigate = useNavigate();
  const { user, onSignedOut, startDirect } = useOutletContext<ChatOutletContext>();
  const [profile, setProfile] = useState<UserProfile | null>(() =>
    self ? seedSelfProfile(user) : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(self ? user.name : "");
  const [customStatus, setCustomStatus] = useState(self ? (user.customStatus ?? "") : "");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [loading, setLoading] = useState(!self);
  const [signingOut, setSigningOut] = useState(false);
  const [copied, setCopied] = useState(false);

  const userId = self ? "me" : params.userId;
  const shareUrl = useMemo(() => {
    if (!profile) return window.location.href;
    return `${window.location.origin}/profile/${profile.id}`;
  }, [profile]);

  useDocumentMeta({
    title: profile
      ? `${profile.name}${profile.username ? ` (@${profile.username})` : ""} · Relay`
      : "Profile · Relay",
    description:
      profile?.description ||
      profile?.customStatus ||
      "Relay profile — private realtime messaging.",
    path: profile ? `/profile/${profile.id}` : "/settings/profile",
  });

  useEffect(() => {
    void (async () => {
      if (!self) setLoading(true);
      setError(null);

      if (isE2eMode()) {
        const demo: UserProfile =
          self || userId === "me" || userId === E2E_PROFILE.id
            ? E2E_PROFILE
            : {
                ...E2E_PEER,
                customStatus: "hello",
                description: "Alice on Relay",
                lastActiveAt: null,
                isOnline: true,
                deviceInfo: null,
                showLastActive: true,
                showDeviceInfo: false,
              };
        setProfile(demo);
        setName(demo.name);
        setCustomStatus(demo.customStatus ?? "");
        setDescription(demo.description ?? "");
        setLoading(false);
        return;
      }

      const path = self || userId === "me" ? "/me/profile" : `/users/${userId}/profile`;
      const response = await fetch(`${apiUrl}${path}`, { credentials: "include" });
      if (!response.ok) {
        if (!self) setError("Could not load profile");
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

  async function copyShareUrl() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Could not copy link");
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

  if (loading && !profile) {
    return (
      <div className={`profile-page ${isSelf ? "self" : "guest"}`}>
        <div className="profile-card">
          <div className="profile-hero-stack">
            <Avatar name={user.name} image={user.image} online size="xl" />
            <p className="kicker">Loading…</p>
            <h1>{user.name}</h1>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        {!self ? (
          <button className="ghost-btn back-btn" type="button" onClick={() => navigate(-1)}>
            <ArrowLeftIcon size={18} />
            Back
          </button>
        ) : null}
        <p className="muted">{error || "Profile not found"}</p>
      </div>
    );
  }

  const body = (
    <div className={`profile-page ${isSelf ? "self" : "guest"}`}>
      {!self ? (
        <header className="profile-toolbar">
          <button className="ghost-btn back-btn" type="button" onClick={() => navigate(-1)}>
            <ArrowLeftIcon size={18} />
            Back
          </button>
        </header>
      ) : (
        <header className="profile-toolbar">
          <h2 style={{ margin: 0 }}>My profile</h2>
        </header>
      )}

      <div className="profile-card">
        <div className="profile-hero-stack">
          <Avatar name={profile.name} image={profile.image} online={profile.isOnline} size="xl" />
          <p className="kicker">{profile.username ? `@${profile.username}` : "Relay"}</p>
          <h1>{profile.name}</h1>
          {profile.customStatus ? <p className="status-line">{profile.customStatus}</p> : null}
          <UserPresence
            isOnline={profile.isOnline}
            lastActiveAt={profile.lastActiveAt}
            deviceInfo={profile.deviceInfo}
          />
        </div>

        {profile.description ? <p className="profile-bio">{profile.description}</p> : null}

        <div className="row wrap profile-actions">
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
          <div className="qr-wrap">
            <div className="qr-card" aria-hidden="true">
              <QRCodeSVG value={shareUrl} size={180} level="M" includeMargin={false} />
            </div>
            <div className="qr-meta">
              <p className="qr-url">{shareUrl}</p>
              <div className="qr-actions">
                <button className="ghost-btn" type="button" onClick={() => void copyShareUrl()}>
                  {copied ? "Copied" : "Copy link"}
                </button>
                <a className="ghost-btn" href={shareUrl} target="_blank" rel="noreferrer">
                  Open
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {isSelf ? (
        <div className="profile-card stack" style={{ marginTop: 16 }}>
          <h2>Edit profile</h2>
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

  if (self) {
    return body;
  }

  return <div className="profile-scroll">{body}</div>;
}
