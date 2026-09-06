import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  PresencePayload,
  ServerToClientEvents,
} from "../../../shared/types";
import { apiUrl } from "./auth-client";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(apiUrl, {
      withCredentials: true,
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

export function subscribePresence(
  handler: (payload: PresencePayload) => void,
): () => void {
  const current = getSocket();
  current.on("presence:update", handler);
  return () => {
    current.off("presence:update", handler);
  };
}

export function pingPresence(): void {
  const current = getSocket();
  if (current.connected) {
    current.emit("presence:ping");
  }
}
