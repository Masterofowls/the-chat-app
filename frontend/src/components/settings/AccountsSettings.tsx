import { useEffect, useRef, useState } from "react";
import { AccountLinks } from "../AccountLinks";
import { apiUrl } from "../../lib/auth-client";

type TelegramWidgetUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

export function AccountsSettings() {
  const [telegramStatus, setTelegramStatus] = useState<{
    linked: boolean;
    telegramUsername: string | null;
    botUsername: string | null;
    enabled: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const widgetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void fetch(`${apiUrl}/telegram/widget/status`, { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return;
        setTelegramStatus(await response.json());
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!telegramStatus?.enabled || !telegramStatus.botUsername || telegramStatus.linked) {
      return;
    }
    const container = widgetRef.current;
    if (!container) return;

    const callbackName = "__relayTelegramLink";
    (window as unknown as Record<string, unknown>)[callbackName] = async (
      user: TelegramWidgetUser,
    ) => {
      setError(null);
      const response = await fetch(`${apiUrl}/telegram/widget/link`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Could not link Telegram");
        return;
      }
      setTelegramStatus((current) =>
        current
          ? {
              ...current,
              linked: true,
              telegramUsername: user.username ?? null,
            }
          : current,
      );
    };

    container.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", telegramStatus.botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", `${callbackName}(user)`);
    container.appendChild(script);

    return () => {
      delete (window as unknown as Record<string, unknown>)[callbackName];
      container.innerHTML = "";
    };
  }, [telegramStatus]);

  async function unlinkTelegram() {
    const response = await fetch(`${apiUrl}/telegram/widget/unlink`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      setError("Could not unlink Telegram");
      return;
    }
    setTelegramStatus((current) =>
      current ? { ...current, linked: false, telegramUsername: null } : current,
    );
  }

  return (
    <div className="settings-page">
      <p className="kicker">Accounts</p>
      <h2 className="serif">Connected accounts</h2>
      <div className="stack" style={{ marginTop: 20 }}>
        <AccountLinks />
        <section className="panel-card">
          <p className="kicker">Telegram</p>
          <h3>Native Telegram login</h3>
          <p className="muted">
            {telegramStatus?.linked
              ? `Linked as @${telegramStatus.telegramUsername || "telegram"}`
              : "Link Telegram Login Widget for native sign-in."}
          </p>
          {telegramStatus?.linked ? (
            <button className="ghost-btn" type="button" onClick={() => void unlinkTelegram()}>
              Unlink Telegram
            </button>
          ) : (
            <div ref={widgetRef} />
          )}
          {!telegramStatus?.enabled ? (
            <p className="muted">Set TELEGRAM_BOT_TOKEN and BOT_USERNAME to enable the widget.</p>
          ) : null}
          {error ? <p className="banner">{error}</p> : null}
        </section>
      </div>
    </div>
  );
}
