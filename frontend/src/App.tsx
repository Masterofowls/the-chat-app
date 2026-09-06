import { Navigate, Route, Routes } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import type { UserSummary } from "../../shared/types";
import { SignIn } from "./components/SignIn";
import { AppLayout } from "./components/layout/AppLayout";
import { ChatPane } from "./components/layout/ChatPane";
import { ProfilePage } from "./components/profile/ProfilePage";
import { AccountsSettings } from "./components/settings/AccountsSettings";
import { DangerSettings } from "./components/settings/DangerSettings";
import { PasskeysSettings } from "./components/settings/PasskeysSettings";
import { PasswordSettings } from "./components/settings/PasswordSettings";
import { PrivacySettings } from "./components/settings/PrivacySettings";
import { SessionsSettings } from "./components/settings/SessionsSettings";
import { SettingsLayout } from "./components/settings/SettingsLayout";
import { SettingsOverview } from "./components/settings/SettingsOverview";
import { TelegramSettings } from "./components/settings/TelegramSettings";
import { TwoFactorSettings } from "./components/settings/TwoFactorSettings";
import { authClient } from "./lib/auth-client";

export function App() {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const { data } = await Promise.race([
        authClient.getSession(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("session-timeout")), 4000);
        }),
      ]);
      if (!data?.user) {
        setUser(null);
        return;
      }
      setUser({
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        image: data.user.image ?? null,
        username: "username" in data.user ? (data.user.username as string | null) : null,
        isOnline: true,
      });
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  if (loading) {
    return (
      <main className="auth-screen">
        <p className="muted">Opening Relay…</p>
      </main>
    );
  }

  if (!user) {
    return <SignIn onAuthed={() => void loadSession()} />;
  }

  return (
    <Routes>
      <Route
        element={
          <AppLayout
            user={user}
            onSignedOut={() => {
              setUser(null);
            }}
          />
        }
      >
        <Route index element={<ChatPane />} />
        <Route path="chat/:conversationId" element={<ChatPane />} />
        <Route path="settings" element={<SettingsLayout />}>
          <Route index element={<SettingsOverview />} />
          <Route path="passkeys" element={<PasskeysSettings />} />
          <Route path="accounts" element={<AccountsSettings />} />
          <Route path="two-factor" element={<TwoFactorSettings />} />
          <Route path="sessions" element={<SessionsSettings />} />
          <Route path="privacy" element={<PrivacySettings />} />
          <Route path="password" element={<PasswordSettings />} />
          <Route path="telegram" element={<TelegramSettings />} />
          <Route path="danger" element={<DangerSettings />} />
        </Route>
        <Route path="me" element={<ProfilePage self />} />
        <Route path="profile/:userId" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
