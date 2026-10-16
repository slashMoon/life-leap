import { advanceOnTrack } from "./board";
import { rollDice } from "./dice";
import type { PlayerRuntimeState } from "@/types/player";
import { applyTileEffect } from "./tile-effects";

function rollForTurn(state: PlayerRuntimeState): number {
  if (state.windFireWheel) {
    return rollDice() + rollDice() + rollDice();
  }
  return rollDice();
}

export function executeTurn(state: PlayerRuntimeState): PlayerRuntimeState {
  const usedWindFire = state.windFireWheel ?? false;
  const dice = rollForTurn(state);
  const { index, tile } = advanceOnTrack(state.track, state.boardIndex, dice);

  let next: PlayerRuntimeState = {
    ...state,
    windFireWheel: false,
    lastDice: dice,
    boardIndex: index,
  };

  if (tile) {
    next = applyTileEffect(next, tile);
  }

  if (usedWindFire) {
    next = {
      ...next,
      eventLog: [`风火轮 · 3 骰合计 ${dice} 点`, ...next.eventLog].slice(0, 30),
    };
  }

  return next;
}

export type { PlayerRuntimeState };
