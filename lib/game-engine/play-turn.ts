import { tilesAlongMove } from "./board";
import { rollDice } from "./dice";
import type { PlayerRuntimeState } from "@/types/player";
import { applyTileEffect, payPaydayWage } from "./tile-effects";

function rollForTurn(state: PlayerRuntimeState): number {
  if (state.windFireWheel) {
    return rollDice() + rollDice() + rollDice();
  }
  return rollDice();
}

/** 走若干格。路过的结账日只发工资；落点若是结账日，再做支出、利息和跃迁。 */
export function resolveBoardMove(
  state: PlayerRuntimeState,
  steps: number
): PlayerRuntimeState {
  const path = tilesAlongMove(state.track, state.boardIndex, steps);
  const destination = path[path.length - 1];
  let next: PlayerRuntimeState = {
    ...state,
    boardIndex: destination?.index ?? state.boardIndex,
  };

  for (const tile of path.slice(0, -1)) {
    if (tile.type === "settlement") next = payPaydayWage(next);
  }
  if (destination) next = applyTileEffect(next, destination);
  return next;
}

export function executeTurn(state: PlayerRuntimeState): PlayerRuntimeState {
  const usedWindFire = state.windFireWheel ?? false;
  const dice = rollForTurn(state);
  let next = resolveBoardMove(
    { ...state, windFireWheel: false, lastDice: dice },
    dice
  );

  if (usedWindFire) {
    next = {
      ...next,
      eventLog: [`风火轮 · 3 骰合计 ${dice} 点`, ...next.eventLog].slice(0, 30),
    };
  }

  return next;
}

export type { PlayerRuntimeState };
