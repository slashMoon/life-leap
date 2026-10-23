import type { IdentityId, RoomPlayerRole } from "@/types/identity";
import type { GameMode, RoomConfig, RoomStatus } from "@/types/game";

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
  code: string;
  name: string;
  /** 只留在服务端。下发给客户端时改成 hasPassword。 */
  password: string | null;
  mode: GameMode;
  isPublic: boolean;
  fillBots: boolean;
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
