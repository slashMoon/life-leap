import { create } from "zustand";
import type { RoomConfig, RoomStatus } from "@/types/game";

import type { IdentityId, RoomPlayerRole } from "@/types/identity";

export interface RoomPlayerView {
  id: string;
  userId: string;
  nickname: string;
  order: number;
  status: string;
  role?: RoomPlayerRole;
  circle?: string;
  identityId?: IdentityId;
  identityName?: string;
}

interface RoomStore {
  roomId: string | null;
  name: string;
  status: RoomStatus;
  config: RoomConfig | null;
  players: RoomPlayerView[];
  hostUserId?: string | null;
  bankerUserId?: string | null;
  setRoom: (payload: {
    roomId: string;
    name: string;
    status: RoomStatus;
    config: RoomConfig;
    hostUserId?: string | null;
    bankerUserId?: string | null;
  }) => void;
  setPlayers: (players: RoomPlayerView[]) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomStore>((set) => ({
  roomId: null,
  name: "",
  status: "waiting",
  config: null,
  players: [],
  hostUserId: null,
  bankerUserId: null,
  setRoom: ({ roomId, name, status, config, hostUserId, bankerUserId }) =>
    set({ roomId, name, status, config, hostUserId, bankerUserId }),
  setPlayers: (players) => set({ players }),
  reset: () =>
    set({
      roomId: null,
      name: "",
      status: "waiting",
      config: null,
      players: [],
      hostUserId: null,
      bankerUserId: null,
    }),
}));
