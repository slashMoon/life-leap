import { create } from "zustand";
import type { CashFlowSnapshot, LifeCircle } from "@/types/game";
import type { BoardTile } from "@/types/game";
import type { PlayerRuntimeState, TileEventResult } from "@/types/player";
import { createInitialPlayerState } from "@/lib/game-engine/tile-effects";
import { resolvePendingDecision } from "@/lib/game-engine/decisions";

interface GameStore {
  roomId: string | null;
  userId: string | null;
  player: PlayerRuntimeState;
  isRolling: boolean;
  setSession: (roomId: string, userId: string) => void;
  setPlayer: (player: PlayerRuntimeState) => void;
  setRolling: (v: boolean) => void;
  setLastDice: (v: number) => void;
  applyTurnResult: (player: PlayerRuntimeState) => void;
  resolveDecision: (accept: boolean) => void;
  reset: () => void;
  /** 兼容旧字段 */
  circle: LifeCircle;
  cashFlow: CashFlowSnapshot | null;
}

export const useGameStore = create<GameStore>((set) => ({
  roomId: null,
  userId: null,
  player: createInitialPlayerState(),
  isRolling: false,
  circle: "牛马",
  cashFlow: null,

  setSession: (roomId, userId) => set({ roomId, userId }),

  setPlayer: (player) =>
    set({
      player,
      circle: player.circle,
      cashFlow: player.cashFlow,
    }),

  setRolling: (isRolling) => set({ isRolling }),

  setLastDice: (lastDice) =>
    set((s) => ({
      player: { ...s.player, lastDice },
    })),

  applyTurnResult: (player) =>
    set({
      player,
      circle: player.circle,
      cashFlow: player.cashFlow,
      isRolling: false,
    }),

  resolveDecision: (accept) =>
    set((s) => {
      const next = resolvePendingDecision(s.player, accept);
      return {
        player: next,
        circle: next.circle,
        cashFlow: next.cashFlow,
      };
    }),

  reset: () => {
    const initial = createInitialPlayerState();
    set({
      roomId: null,
      userId: null,
      player: initial,
      isRolling: false,
      circle: initial.circle,
      cashFlow: initial.cashFlow,
    });
  },
}));

export type { TileEventResult, BoardTile };
