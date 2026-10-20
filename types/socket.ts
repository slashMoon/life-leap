import type { CashFlowSnapshot, DiceRollResult } from "./game";
import type { IdentityId, RoomPlayerRole } from "./identity";
import type { GameSnapshot } from "@/lib/game-session/types";

export type { GameSnapshot };

/** 客户端 → 服务端。客户端只提交意图，不提交账本。 */
export interface ClientToServerEvents {
  "room:join": (payload: {
    roomId: string;
    userId: string;
    nickname?: string;
    /** true 时创建或恢复棋盘座位；false 只加入房间频道（房间页在线） */
    playing?: boolean;
    identityId?: IdentityId;
    role?: RoomPlayerRole;
    order?: number;
    coreNetWorthThreshold?: number;
    corePassiveIncomeMultiplier?: number;
  }) => void;
  "room:leave": (payload: { roomId: string; userId: string }) => void;
  "room:ready": (payload: { roomId: string; userId: string }) => void;
  "game:roll-dice": (payload: { roomId: string; userId: string }) => void;
  "game:decide": (payload: {
    roomId: string;
    userId: string;
    accept: boolean;
  }) => void;
  "game:repay": (payload: {
    roomId: string;
    userId: string;
    amount: number;
  }) => void;
  "game:draw-card": (payload: {
    roomId: string;
    userId: string;
    cardType: string;
  }) => void;
  "game:trade": (payload: {
    roomId: string;
    fromUserId: string;
    toUserId: string;
    assetId: string;
    price: number;
  }) => void;
  "chat:message": (payload: {
    roomId: string;
    userId: string;
    nickname?: string;
    content: string;
  }) => void;
}

/** 服务端 → 客户端 */
export interface ServerToClientEvents {
  "room:state": (state: unknown) => void;
  "room:player-joined": (player: {
    userId: string;
    nickname?: string;
    playing?: boolean;
  }) => void;
  "room:player-left": (payload: { userId: string }) => void;
  "game:state": (state: GameSnapshot) => void;
  "game:dice-rolled": (result: DiceRollResult) => void;
  "game:tile-landed": (payload: {
    userId: string;
    track: "outer" | "inner";
    index: number;
    tileType: string;
    tileLabel?: string;
  }) => void;
  "game:card-drawn": (payload: { userId: string; card: unknown }) => void;
  "game:cash-flow-updated": (payload: {
    userId: string;
    snapshot: CashFlowSnapshot;
  }) => void;
  "game:circle-changed": (payload: {
    userId: string;
    from: string;
    to: string;
  }) => void;
  "game:turn-changed": (payload: { currentPlayerOrder: number }) => void;
  "chat:message": (payload: {
    userId: string;
    nickname: string;
    content: string;
    at: number;
  }) => void;
  error: (payload: { code: string; message: string }) => void;
}
