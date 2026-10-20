import type { LifeCircle } from "@/types/game";
import type { IdentityId, RoomPlayerRole } from "@/types/identity";
import type { PlayerRuntimeState } from "@/types/player";

export interface GameSeat {
  userId: string;
  nickname: string;
  role: RoomPlayerRole;
  order: number;
  connected: boolean;
  state: PlayerRuntimeState;
}

export interface ChatLine {
  userId: string;
  nickname: string;
  content: string;
  at: number;
}

/** 一局的权威会话。同一进程内以内存为准，Redis 只做写穿。 */
export interface GameSession {
  roomId: string;
  seats: GameSeat[];
  currentUserId: string | null;
  lastActorUserId: string | null;
  /** 已经发生过掷骰、决策或还款后，不再因新人加入而重排当前回合 */
  started: boolean;
  chat: ChatLine[];
  revision: number;
}

export interface GameSnapshot {
  roomId: string;
  phase: "playing";
  currentUserId: string | null;
  turnOrder: string[];
  lastActorUserId: string | null;
  seats: Array<{
    userId: string;
    nickname: string;
    role: RoomPlayerRole;
    order: number;
    connected: boolean;
    state: PlayerRuntimeState;
  }>;
  chat: ChatLine[];
  revision: number;
}

export interface JoinSeatInput {
  userId: string;
  nickname?: string;
  role?: RoomPlayerRole;
  order?: number;
  identityId?: IdentityId;
  coreNetWorthThreshold?: number;
  corePassiveIncomeMultiplier?: number;
}

export interface SessionCommandResult {
  ok: boolean;
  code?: string;
  message?: string;
  createdSeat?: boolean;
  snapshot: GameSnapshot;
  dice?: { playerId: string; value: number; timestamp: number };
  tile?: {
    userId: string;
    track: "outer" | "inner";
    index: number;
    tileType: string;
    tileLabel?: string;
  };
  circle?: { userId: string; from: LifeCircle; to: LifeCircle };
  chat?: ChatLine;
}
