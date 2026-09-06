import { useRegisterSW } from "virtual:pwa-register/react";

export function usePwaRegister() {
  useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl) {
      if (import.meta.env.DEV) {
        console.debug("[pwa] registered", swUrl);
      }
    },
  });
}
