"use client";

import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { resolveSocketUrl } from "@/lib/socket-url";
import type { ClientToServerEvents, ServerToClientEvents } from "@/types/socket";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket(roomId?: string) {
  const [socket, setSocket] = useState<GameSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const url = resolveSocketUrl(
      {
        NEXT_PUBLIC_SOCKET_URL: process.env.NEXT_PUBLIC_SOCKET_URL,
        NODE_ENV: process.env.NODE_ENV,
      },
      typeof window !== "undefined" ? window.location.origin : undefined
    );

    const instance: GameSocket = io(url, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      query: roomId ? { roomId } : undefined,
    });

    const onConnect = () => {
      setConnected(true);
      setSocket(instance);
    };
    const onDisconnect = () => setConnected(false);

    instance.on("connect", onConnect);
    instance.on("disconnect", onDisconnect);

    if (instance.connected) onConnect();

    return () => {
      instance.off("connect", onConnect);
      instance.off("disconnect", onDisconnect);
      instance.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [roomId]);

  return { socket, connected };
}
