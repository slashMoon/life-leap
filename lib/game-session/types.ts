import type { GameMode, LifeCircle } from "@/types/game";
import type { IdentityId, RoomPlayerRole } from "@/types/identity";
import type { PlayerRuntimeState } from "@/types/player";

export interface GameSeat {
  userId: string;
  nickname: string;
  role: RoomPlayerRole;
  order: number;
  connected: boolean;
  /** 单人试玩里的机器人，到点由服务端代掷 */
  bot?: boolean;
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
  mode: GameMode;
  seats: GameSeat[];
  currentUserId: string | null;
  lastActorUserId: string | null;
  /** 已经发生过掷骰、决策或还款后，不再因新人加入而重排当前回合 */
  started: boolean;
  /** 真人掉线后，到这个时间点仍未回来就代掷 */
  turnDeadlineAt?: number | null;
  chat: ChatLine[];
  revision: number;
}

export interface GameSnapshot {
  roomId: string;
  mode: GameMode;
  phase: "playing";
  currentUserId: string | null;
  turnOrder: string[];
  lastActorUserId: string | null;
  turnDeadlineAt?: number | null;
  seats: Array<{
    userId: string;
    nickname: string;
    role: RoomPlayerRole;
    order: number;
    connected: boolean;
    bot?: boolean;
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
  skipped?: boolean;
  dice?: { playerId: string; value: number; timestamp: number; reason?: "bot" | "timeout" };
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
