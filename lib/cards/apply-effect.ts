import type { LifeCircle } from "@/types/game";
import type { DecisionPreview, PlayerRuntimeState } from "@/types/player";
import type { CardEffect, GameCard } from "./types";
import { getParticipationCost } from "./pool";
import { appendLog, withCashFlow } from "@/lib/game-engine/player-finance";

export function buildDecisionPreview(
  card: GameCard,
  state: PlayerRuntimeState
): DecisionPreview {
  const e = card.effect;
  const cost = getParticipationCost(e);
  const laborIncomeDelta = e.laborIncome || undefined;
  const passiveIncomeDelta = e.passiveIncome || undefined;
  const expenseDelta = e.expense || undefined;
  const liabilityDelta = e.loan || undefined;

  const parts: string[] = [];
  if (cost > 0) parts.push(`一次性支出 ${cost.toLocaleString()} 元`);
  if (laborIncomeDelta) parts.push(`月薪 +${laborIncomeDelta.toLocaleString()}`);
  if (passiveIncomeDelta)
    parts.push(`被动收入 +${passiveIncomeDelta.toLocaleString()}/月`);
  if (expenseDelta) parts.push(`月支出 +${expenseDelta.toLocaleString()}`);
  if (liabilityDelta) parts.push(`新增负债 ${liabilityDelta.toLocaleString()}`);

  return {
    cost,
    laborIncomeDelta,
    passiveIncomeDelta,
    expenseDelta,
    liabilityDelta,
    canAfford: state.cash >= cost,
    summary: parts.length ? parts.join("，") : "无财务变动",
  };
}

/** 应用参与决策后的卡牌效果（进修 / 机会 / 投资等） */
export function applyParticipationEffect(
  state: PlayerRuntimeState,
  card: GameCard
): PlayerRuntimeState {
  const preview = buildDecisionPreview(card, state);
  const prev = state.cashFlow;
  let next = withCashFlow(
    state,
    {
      laborIncome: prev.laborIncome + (preview.laborIncomeDelta ?? 0),
      passiveIncome: prev.passiveIncome + (preview.passiveIncomeDelta ?? 0),
      totalExpense: prev.totalExpense + (preview.expenseDelta ?? 0),
      totalLiabilities: prev.totalLiabilities + (preview.liabilityDelta ?? 0),
    },
    -preview.cost
  );
  return applyScoreEffects(next, card);
}

/** 应用风险卡（强制生效） */
export function applyRiskEffect(
  state: PlayerRuntimeState,
  card: GameCard
): { state: PlayerRuntimeState; message: string } {
  const e = card.effect;
  let next = state;
  const parts: string[] = [card.name];

  if (e.cashDelta) {
    next = withCashFlow(next, {}, e.cashDelta);
    parts.push(`现金 ${e.cashDelta.toLocaleString()}`);
  }
  if (e.payTotalExpense) {
    const pay = next.cashFlow.totalExpense;
    next = withCashFlow(next, {}, -pay);
    parts.push(`支付总支出 ${pay.toLocaleString()}`);
  }
  if (e.percentCashLoss) {
    const loss = Math.round(next.cash * e.percentCashLoss);
    next = withCashFlow(next, {}, -loss);
    parts.push(`损失现金 ${loss.toLocaleString()}`);
  }
  if (e.percentIncomeLoss) {
    const loss = Math.round(next.cashFlow.laborIncome * e.percentIncomeLoss);
    next = withCashFlow(next, {}, -loss);
    parts.push(`损失收入 ${loss.toLocaleString()}`);
  }
  if (e.skipRound) {
    parts.push("停赛一轮");
  }

  return { state: next, message: `风险 · ${parts.join(" · ")}` };
}

/** 应用市场信息卡 */
export function applyMarketEffect(
  state: PlayerRuntimeState,
  card: GameCard
): { state: PlayerRuntimeState; message: string; delta: number } {
  const e = card.effect;
  let delta = 0;

  if (e.marketPrice) {
    // 市场收购价：按净资产 2% 波动模拟市场行情
    delta = Math.round(state.cashFlow.netWorth * 0.02);
  } else {
    delta = Math.round(state.cashFlow.netWorth * 0.03);
  }

  const sign = card.content.includes("下跌") || card.content.includes("降低") ? -1 : 1;
  if (sign < 0) delta = -Math.abs(delta);
  else if (!card.content.includes("上涨") && !card.content.includes("增加")) {
    delta = Math.random() > 0.5 ? delta : -delta;
  }

  const next = withCashFlow(state, {}, delta);
  return {
    state: next,
    delta,
    message: `市场 · ${card.name} · ${delta >= 0 ? "+" : ""}${delta.toLocaleString()}`,
  };
}

/** 应用无需决策的卡牌（有钱有闲 / 品质生活等） */
export function applyPassiveCardEffect(
  state: PlayerRuntimeState,
  card: GameCard
): { state: PlayerRuntimeState; message: string } {
  const e = card.effect;
  let next = state;
  const parts: string[] = [card.name];

  if (e.timePoints) {
    next = {
      ...next,
      timePoints: (next.timePoints ?? 0) + e.timePoints,
    };
    parts.push(`时间积分 +${e.timePoints}`);
  }
  if (e.qualityPoints) {
    next = {
      ...next,
      qualityLifePoints: (next.qualityLifePoints ?? 0) + e.qualityPoints,
    };
    parts.push(`品质积分 +${e.qualityPoints}`);
  }

  if (e.cashDelta) {
    next = withCashFlow(next, {}, e.cashDelta);
    parts.push(`现金 ${e.cashDelta.toLocaleString()}`);
  }

  return {
    state: next,
    message: `${card.category.replace("卡", "")} · ${parts.join(" · ")}`,
  };
}

function applyScoreEffects(
  state: PlayerRuntimeState,
  card: GameCard
): PlayerRuntimeState {
  const e = card.effect;
  let next = state;
  if (e.timePoints) {
    next = {
      ...next,
      timePoints: (next.timePoints ?? 0) + e.timePoints,
    };
  }
  if (e.qualityPoints) {
    next = {
      ...next,
      qualityLifePoints: (next.qualityLifePoints ?? 0) + e.qualityPoints,
    };
  }
  return next;
}

export function formatCardLog(card: GameCard, circle?: LifeCircle): string {
  return `[${card.code}] ${card.name}${circle ? ` · ${circle}圈` : ""}`;
}
