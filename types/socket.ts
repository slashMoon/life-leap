import type { CashFlowSnapshot, DiceRollResult, GameState } from "./game";

/** 客户端 → 服务端 */
export interface ClientToServerEvents {
  "room:join": (payload: { roomId: string; userId: string }) => void;
  "room:leave": (payload: { roomId: string; userId: string }) => void;
  "room:ready": (payload: { roomId: string; userId: string }) => void;
  "game:roll-dice": (payload: { roomId: string; userId: string }) => void;
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
    content: string;
  }) => void;
}

/** 服务端 → 客户端 */
export interface ServerToClientEvents {
  "room:state": (state: unknown) => void;
  "room:player-joined": (player: unknown) => void;
  "room:player-left": (payload: { userId: string }) => void;
  "game:state": (state: GameState) => void;
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
