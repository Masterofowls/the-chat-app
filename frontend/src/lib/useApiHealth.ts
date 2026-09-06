import { useCallback, useEffect, useState } from "react";
import { apiUrl } from "./auth-client";

export type ConnectionState = "online" | "connecting" | "offline";

export function useApiHealth(intervalMs = 8000) {
  const [state, setState] = useState<ConnectionState>(() =>
    typeof window !== "undefined" &&
    (import.meta.env.VITE_E2E === "1" || localStorage.getItem("relay-e2e") === "1")
      ? "online"
      : "connecting",
  );

  const ping = useCallback(async () => {
    if (import.meta.env.VITE_E2E === "1" || localStorage.getItem("relay-e2e") === "1") {
      setState("online");
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch(`${apiUrl}/health`, {
        signal: controller.signal,
        cache: "no-store",
      });
      setState(response.ok ? "online" : "connecting");
    } catch {
      setState("connecting");
    } finally {
      window.clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    void ping();
    const id = window.setInterval(() => void ping(), intervalMs);
    const onOnline = () => void ping();
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onOnline);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onOnline);
    };
  }, [intervalMs, ping]);

  return state;
}
