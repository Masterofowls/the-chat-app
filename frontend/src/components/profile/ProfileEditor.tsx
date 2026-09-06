import { useState } from "react";
import type { UserProfile } from "../../../../shared/types";
import { apiUrl } from "../../lib/auth-client";

type ProfileEditorProps = {
  profile: UserProfile;
  onSaved: (profile: UserProfile) => void;
};

export function ProfileEditor({ profile, onSaved }: ProfileEditorProps) {
  const [name, setName] = useState(profile.name);
  const [customStatus, setCustomStatus] = useState(profile.customStatus ?? "");
  const [description, setDescription] = useState(profile.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    const response = await fetch(`${apiUrl}/me/profile`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        customStatus: customStatus.trim() || null,
        description: description.trim() || null,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      setError("Could not update profile");
      return;
    }
    const data = (await response.json()) as { profile: UserProfile };
    onSaved(data.profile);
    setMessage("Profile updated.");
  }

  return (
    <section className="panel-card settings-card">
      <p className="kicker">Edit profile</p>
      <h2>How you appear</h2>
      <div className="stack" style={{ marginTop: 16 }}>
        <label className="muted" htmlFor="profile-name">
          Display name
        </label>
        <input
          id="profile-name"
          className="field"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <label className="muted" htmlFor="profile-status">
          Status
        </label>
        <input
          id="profile-status"
          className="field"
          value={customStatus}
          maxLength={80}
          onChange={(event) => setCustomStatus(event.target.value)}
          placeholder="Available, in a meeting…"
        />
        <label className="muted" htmlFor="profile-description">
          Description
        </label>
        <textarea
          id="profile-description"
          className="field"
          rows={4}
          maxLength={500}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="A short bio"
        />
        <button className="primary-btn" type="button" disabled={busy} onClick={() => void save()}>
          Save profile
        </button>
        {message ? <p className="banner success">{message}</p> : null}
        {error ? <p className="banner">{error}</p> : null}
      </div>
    </section>
  );
}
