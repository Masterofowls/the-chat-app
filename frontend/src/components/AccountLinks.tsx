import { useCallback, useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";

type LinkedAccount = {
  id: string;
  providerId: string;
  accountId: string;
};

const LINKABLE = [
  { id: "google" as const, label: "Google" },
  { id: "github" as const, label: "GitHub" },
];

export function AccountLinks() {
  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data, error: nextError } = await authClient.listAccounts();
    if (nextError) {
      setError(nextError.message ?? "Could not load linked accounts");
      return;
    }
    setAccounts((data ?? []) as LinkedAccount[]);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function linkProvider(provider: "google" | "github") {
    setBusy(provider);
    setError(null);
    const { error: nextError } = await authClient.linkSocial({
      provider,
      callbackURL: window.location.href,
    });
    setBusy(null);
    if (nextError) {
      setError(nextError.message ?? `Could not link ${provider}`);
    }
  }

  async function unlinkProvider(providerId: string, accountId: string) {
    setBusy(providerId);
    setError(null);
    const { error: nextError } = await authClient.unlinkAccount({
      accountId,
    });
    setBusy(null);
    if (nextError) {
      setError(nextError.message ?? `Could not unlink ${providerId}`);
      return;
    }
    await refresh();
  }

  const linkedProviders = new Set(accounts.map((account) => account.providerId));

  return (
    <section className="panel-card">
      <p className="kicker">Connected accounts</p>
      <h2>Link Google or GitHub</h2>
      <p className="muted">Attach OAuth providers to this username account.</p>
      <div className="stack" style={{ marginTop: 16 }}>
        {LINKABLE.map((provider) => {
          const linked = accounts.find((account) => account.providerId === provider.id);
          return (
            <div key={provider.id} className="row" style={{ justifyContent: "space-between" }}>
              <div>
                <strong>{provider.label}</strong>
                <br />
                <small className="muted">{linked ? "Linked" : "Not linked"}</small>
              </div>
              {linked ? (
                <button
                  className="ghost-btn"
                  type="button"
                  disabled={busy === provider.id}
                  onClick={() => void unlinkProvider(linked.providerId, linked.accountId)}
                >
                  Unlink
                </button>
              ) : (
                <button
                  className="ghost-btn"
                  type="button"
                  disabled={busy === provider.id}
                  onClick={() => void linkProvider(provider.id)}
                >
                  Link
                </button>
              )}
            </div>
          );
        })}
        {linkedProviders.has("credential") ? (
          <p className="muted">Password login is enabled on this account.</p>
        ) : (
          <p className="muted">
            Sign up with username/password first if you want a credential login method.
          </p>
        )}
        {error ? <p className="banner">{error}</p> : null}
      </div>
    </section>
  );
}
