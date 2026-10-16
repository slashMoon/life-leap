import type { BoardTile } from "@/types/game";
import type { GameCard } from "@/lib/cards/types";
import type {
  PendingDecision,
  PlayerRuntimeState,
  TileEventResult,
} from "@/types/player";
import {
  applyParticipationEffect,
  buildDecisionPreview,
} from "@/lib/cards/apply-effect";
import { WIND_FIRE_WHEEL_INCOME_RATE } from "@/lib/constants/circle-rules";
import { cardTypeLabel, getCardById } from "@/lib/cards/pool";
import {
  appendLog,
  applyCircleTransition,
  withCashFlow,
} from "./player-finance";

/** 需要玩家决策的格子类型 */
const DECISION_TILES = new Set([
  "opportunity",
  "study",
  "investment",
  "wealth_leisure",
  "quality_life",
]);

export function isDecisionTile(type: string): boolean {
  return DECISION_TILES.has(type);
}

export function buildPendingDecision(
  state: PlayerRuntimeState,
  tile: BoardTile,
  card: GameCard
): PendingDecision {
  return {
    tileType: tile.type as PendingDecision["tileType"],
    tile,
    cardId: card.id,
    cardName: card.name,
    cardContent: card.content,
    preview: buildDecisionPreview(card, state),
  };
}

export function createDecisionEvent(
  pending: PendingDecision,
  cashFlow: PlayerRuntimeState["cashFlow"]
): TileEventResult {
  const label = cardTypeLabel(pending.tileType);
  return {
    message: `到达「${pending.tile.label}」· 抽取${label} · 是否参与？`,
    cardTitle: pending.cardName,
    cardContent: pending.cardContent,
    cashFlow,
    requiresDecision: true,
    preview: pending.preview,
  };
}

export function resolvePendingDecision(
  state: PlayerRuntimeState,
  accept: boolean
): PlayerRuntimeState {
  const pending = state.pendingDecision;
  if (!pending) return state;

  let next: PlayerRuntimeState = { ...state, pendingDecision: null };

  if (!accept) {
    const msg = `放弃 · ${pending.cardName}`;
    return appendLog(
      {
        ...next,
        lastEvent: { message: msg, cashFlow: next.cashFlow },
      },
      msg
    );
  }

  const { preview } = pending;
  if (!preview.canAfford) {
    return {
      ...next,
      pendingDecision: pending,
      lastEvent: {
        message: `现金不足，无法参与（需 ${preview.cost.toLocaleString()} 元）`,
        cardTitle: pending.cardName,
        cardContent: pending.cardContent,
        cashFlow: next.cashFlow,
        requiresDecision: true,
        preview,
      },
    };
  }

  const card = getCardById(pending.cardId);
  if (!card) {
    return appendLog(next, `卡牌不存在 · ${pending.cardId}`);
  }

  next = applyParticipationEffect(next, card);

  const tileType = pending.tileType;
  if (
    next.circle === "牛马" &&
    next.track === "outer" &&
    (tileType === "study" || tileType === "wealth_leisure" || tileType === "quality_life")
  ) {
    const pay = Math.round(
      (next.cashFlow.laborIncome + next.cashFlow.passiveIncome) *
        WIND_FIRE_WHEEL_INCOME_RATE
    );
    if (next.cash >= pay) {
      next = {
        ...withCashFlow(next, {}, -pay),
        windFireWheel: true,
      };
    }
  }

  const label = cardTypeLabel(pending.tileType);
  const msg = `参与${label} · ${pending.cardName} · ${preview.summary}`;
  next = appendLog(next, msg);

  let event: TileEventResult = {
    message: msg,
    cardTitle: pending.cardName,
    cardContent: pending.cardContent,
    cashFlow: next.cashFlow,
  };

  next = applyCircleTransition(next, (circle, circleMsg) => {
    event = { ...event, circle, message: `${event.message} · ${circleMsg}` };
  });

  return { ...next, lastEvent: event };
}

/** 抽卡展示事件（无需决策） */
export function buildCardRevealEvent(
  card: GameCard,
  tile: BoardTile,
  cashFlow: PlayerRuntimeState["cashFlow"],
  message: string
): TileEventResult {
  return {
    message,
    cardTitle: card.name,
    cardContent: card.content,
    cashFlow,
  };
}

export { cardRequiresDecision, pickCardForTile } from "@/lib/cards/pool";
