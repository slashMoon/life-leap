"use client";

import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/api/fetch";
import { getStoredUser } from "@/lib/client/user";
import { useRoomStore } from "@/stores/room-store";
import type { IdentityId, RoomPlayerRole } from "@/types/identity";
import type { RoomConfig, RoomStatus } from "@/types/game";

export interface RoomListItem {
  id: string;
  name: string;
  status: string;
  password: string | null;
  players: { nickname: string; status: string }[];
}

export interface RoomDetail {
  id: string;
  name: string;
  status: string;
  config: RoomConfig;
  hostUserId?: string | null;
  bankerUserId?: string | null;
  players: {
    id: string;
    userId: string;
    nickname: string;
    order: number;
    status: string;
    role?: RoomPlayerRole;
    identityId?: IdentityId;
    identityName?: string;
  }[];
}

function mapPlayers(
  players: RoomDetail["players"]
): import("@/stores/room-store").RoomPlayerView[] {
  return (players ?? []).map((p) => ({
    ...p,
    role: p.role as RoomPlayerRole | undefined,
  }));
}

function applyRoomToStore(
  data: RoomDetail,
  setRoom: ReturnType<typeof useRoomStore.getState>["setRoom"],
  setPlayers: ReturnType<typeof useRoomStore.getState>["setPlayers"]
) {
  setRoom({
    roomId: data.id,
    name: data.name,
    status: data.status as RoomStatus,
    config: data.config,
    hostUserId: data.hostUserId,
    bankerUserId: data.bankerUserId,
  });
  setPlayers(mapPlayers(data.players));
}

export function useRoom() {
  const roomId = useRoomStore((s) => s.roomId);
  const name = useRoomStore((s) => s.name);
  const status = useRoomStore((s) => s.status);
  const config = useRoomStore((s) => s.config);
  const players = useRoomStore((s) => s.players);
  const bankerUserId = useRoomStore((s) => s.bankerUserId);
  const setRoom = useRoomStore((s) => s.setRoom);
  const setPlayers = useRoomStore((s) => s.setPlayers);
  const reset = useRoomStore((s) => s.reset);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRoom = useCallback(
    async (id: string) => {
      const data = await apiFetch<RoomDetail>(`/api/room/${id}`);
      applyRoomToStore(data, setRoom, setPlayers);
      return data;
    },
    [setRoom, setPlayers]
  );

  const listRooms = useCallback(async () => {
    return apiFetch<RoomListItem[]>("/api/room");
  }, []);

  const createRoom = useCallback(
    async (payload: { name: string; password?: string; config: RoomConfig }) => {
      const { userId, nickname } = getStoredUser();
      return apiFetch<RoomDetail>("/api/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          hostUserId: userId,
          hostNickname: nickname,
        }),
      });
    },
    []
  );

  const joinRoom = useCallback(
    async (id: string) => {
      const { userId, nickname } = getStoredUser();
      const data = await apiFetch<RoomDetail>(`/api/room/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", userId, nickname }),
      });
      applyRoomToStore(data, setRoom, setPlayers);
      return data;
    },
    [setRoom, setPlayers]
  );

  /** 进入房间：拉取详情并加入（只调一次） */
  const enterRoom = useCallback(
    async (id: string) => {
      const { userId, nickname } = getStoredUser();
      const data = await apiFetch<RoomDetail>(`/api/room/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "enter",
          userId,
          nickname,
        }),
      });
      applyRoomToStore(data, setRoom, setPlayers);
      return data;
    },
    [setRoom, setPlayers]
  );

  const setPlayerReady = useCallback(
    async (id: string) => {
      const { userId, nickname } = getStoredUser();
      const data = await apiFetch<RoomDetail>(`/api/room/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ready", userId, nickname }),
      });
      setPlayers(mapPlayers(data.players ?? []));
      return data;
    },
    [setPlayers]
  );

  const startGame = useCallback(
    async (id: string) => {
      const data = await apiFetch<RoomDetail>(`/api/room/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      applyRoomToStore(data, setRoom, setPlayers);
      return data;
    },
    [setRoom, setPlayers]
  );

  const prepareSoloPlay = useCallback(
    async (id: string) => {
      const { userId, nickname } = getStoredUser();
      const data = await apiFetch<RoomDetail>(`/api/room/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "prepareSoloPlay",
          userId,
          nickname,
        }),
      });
      applyRoomToStore(data, setRoom, setPlayers);
      return data;
    },
    [setRoom, setPlayers]
  );

  const assignRandomIdentity = useCallback(
    async (id: string) => {
      const { userId, nickname } = getStoredUser();
      const data = await apiFetch<
        RoomDetail & { assignedIdentityId?: IdentityId }
      >(`/api/room/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assignRandomIdentity",
          userId,
          nickname,
        }),
      });
      setPlayers(mapPlayers(data.players ?? []));
      return data;
    },
    [setPlayers]
  );

  const setBanker = useCallback(
    async (id: string) => {
      const { userId, nickname } = getStoredUser();
      const data = await apiFetch<RoomDetail>(`/api/room/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setBanker", userId, nickname }),
      });
      applyRoomToStore(data, setRoom, setPlayers);
      return data;
    },
    [setRoom, setPlayers]
  );

  const run = useCallback(async <T,>(fn: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "操作失败";
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    roomId,
    name,
    status,
    config,
    players,
    bankerUserId,
    loading,
    error,
    reset,
    fetchRoom,
    listRooms,
    createRoom,
    joinRoom,
    enterRoom,
    setPlayerReady,
    startGame,
    prepareSoloPlay,
    assignRandomIdentity,
    /** @deprecated 使用 assignRandomIdentity */
    selectIdentity: assignRandomIdentity,
    setBanker,
    run,
  };
}
