import { buildCashFlowSnapshot } from "@/lib/rule-engine";
import {
  buildTransitionContext,
  evaluateCircleTransition,
} from "@/lib/rule-engine/circle-transition";
import type { LifeCircle } from "@/types/game";
import type { PlayerRuntimeState, TileEventResult } from "@/types/player";

export function withCashFlow(
  state: PlayerRuntimeState,
  patch: Partial<{
    laborIncome: number;
    passiveIncome: number;
    totalExpense: number;
    totalLiabilities: number;
  }>,
  cashDelta = 0
): PlayerRuntimeState {
  const prev = state.cashFlow;
  const cash = Math.max(0, state.cash + cashDelta);
  const totalLiabilities = patch.totalLiabilities ?? prev.totalLiabilities;
  const cashFlow = buildCashFlowSnapshot({
    laborIncome: patch.laborIncome ?? prev.laborIncome,
    passiveIncome: patch.passiveIncome ?? prev.passiveIncome,
    totalExpense: patch.totalExpense ?? prev.totalExpense,
    totalAssets: cash + Math.max(0, prev.netWorth - prev.totalLiabilities),
    totalLiabilities,
  });

  return { ...state, cash, cashFlow };
}

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
  const result = evaluateCircleTransition(buildTransitionContext(state));
  if (!result.changed) return state;

  let next = appendLog(
    { ...state, circle: result.to },
    `跃迁 · ${state.circle} → ${result.to} · ${result.reason ?? ""}`
  );
  onTransition(result.to, `进入【${result.to}圈】`);

  next = {
    ...next,
    cashAtCircleEntry: next.cash,
  };

  if (result.to === "老板" && next.track === "outer") {
    next = { ...next, track: "inner", boardIndex: 0 };
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
