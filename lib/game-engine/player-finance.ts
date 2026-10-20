import { recalculateCashFlow } from "@/lib/game-engine/ledger";
import {
  buildTransitionContext,
  evaluateCircleTransition,
} from "@/lib/rule-engine/circle-transition";
import type { LifeCircle } from "@/types/game";
import type { PlayerRuntimeState, TileEventResult } from "@/types/player";

export { recalculateCashFlow, repayDebt, sellHolding, withCashFlow } from "@/lib/game-engine/ledger";

export function appendLog(
  state: PlayerRuntimeState,
  msg: string
): PlayerRuntimeState {
  return {
    ...state,
    eventLog: [msg, ...state.eventLog].slice(0, 30),
  };
}

export function applyCircleTransition(
  state: PlayerRuntimeState,
  onTransition: (circle: LifeCircle, message: string) => void
): PlayerRuntimeState {
  let next = recalculateCashFlow(state);

  for (let step = 0; step < 2; step += 1) {
    const result = evaluateCircleTransition(buildTransitionContext(next));
    if (!result.changed) break;

    next = appendLog(
      { ...next, circle: result.to },
      `跃迁 · ${result.from} → ${result.to} · ${result.reason ?? ""}`
    );
    onTransition(result.to, `进入【${result.to}圈】`);
    next = {
      ...next,
      cashAtCircleEntry: next.cash,
    };
    if (result.to === "老板" && next.track === "outer") {
      next = { ...next, track: "inner", boardIndex: 0 };
    }
  }

  return next;
}

export function finalizeEvent(
  state: PlayerRuntimeState,
  event: TileEventResult
): PlayerRuntimeState {
  let next = state;
  let finalEvent = event;

  next = applyCircleTransition(next, (circle, message) => {
    finalEvent = {
      ...finalEvent,
      circle,
      message: `${finalEvent.message} · ${message}`,
    };
  });

  return { ...next, lastEvent: finalEvent };
}
