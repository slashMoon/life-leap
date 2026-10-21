import type { IdentityId, RoomPlayerRole } from "@/types/identity";
import type { RoomConfig, RoomStatus } from "@/types/game";

export interface MockUser {
  id: string;
  nickname: string;
  avatar: string | null;
  createdAt: string;
}

export interface MockRoomPlayer {
  id: string;
  roomId: string;
  userId: string;
  nickname: string;
  order: number;
  status: string;
  role: RoomPlayerRole;
  circle?: string;
  identityId?: IdentityId;
  identityName?: string;
  bot?: boolean;
}

export interface MockRoom {
  id: string;
  name: string;
  password: string | null;
  status: RoomStatus;
  config: RoomConfig;
  createdAt: string;
  hostUserId?: string;
  bankerUserId?: string | null;
  players: MockRoomPlayer[];
}

export interface MockCard {
  id: string;
  type: string;
  name: string;
  content: string;
  effect: Record<string, unknown>;
  status: boolean;
}
