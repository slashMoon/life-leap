import { create } from "zustand";
import type { CashFlowSnapshot, LifeCircle } from "@/types/game";
import type { BoardTile } from "@/types/game";
import type { PlayerRuntimeState, TileEventResult } from "@/types/player";
import { createInitialPlayerState } from "@/lib/game-engine/tile-effects";
import type { GameSnapshot } from "@/lib/game-session/types";

export type PendingAction = "roll" | "decide" | "repay" | null;

interface GameStore {
  roomId: string | null;
  userId: string | null;
  player: PlayerRuntimeState;
  snapshot: GameSnapshot | null;
  synced: boolean;
  isRolling: boolean;
  pendingAction: PendingAction;
  setSession: (roomId: string, userId: string) => void;
  setRolling: (v: boolean) => void;
  setPendingAction: (action: PendingAction) => void;
  applyServerState: (snapshot: GameSnapshot, userId: string) => void;
  reset: () => void;
  circle: LifeCircle;
  cashFlow: CashFlowSnapshot | null;
}

const initial = createInitialPlayerState();

export const useGameStore = create<GameStore>((set) => ({
  roomId: null,
  userId: null,
  player: initial,
  snapshot: null,
  synced: false,
  isRolling: false,
  pendingAction: null,
  circle: initial.circle,
  cashFlow: initial.cashFlow,

  setSession: (roomId, userId) => set({ roomId, userId, synced: false }),

  setRolling: (isRolling) => set({ isRolling }),

  setPendingAction: (pendingAction) => set({ pendingAction }),

  applyServerState: (snapshot, userId) =>
    set((current) => {
      const mine = snapshot.seats.find((seat) => seat.userId === userId);
      const player = mine?.state ?? current.player;
      return {
        snapshot,
        synced: true,
        roomId: snapshot.roomId,
        userId,
        player,
        circle: player.circle,
        cashFlow: player.cashFlow,
      };
    }),

  reset: () => {
    const next = createInitialPlayerState();
    set({
      roomId: null,
      userId: null,
      player: next,
      snapshot: null,
      synced: false,
      isRolling: false,
      pendingAction: null,
      circle: next.circle,
      cashFlow: next.cashFlow,
    });
  },
}));

export type { TileEventResult, BoardTile };
