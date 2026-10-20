import type { BoardTile, LifeCircle } from "@/types/game";
import type {
  DecisionPreview,
  PendingDecision,
  PlayerHolding,
  PlayerRuntimeState,
} from "@/types/player";
import type { GameCard } from "./types";
import {
  ensureLedger,
  recalculateCashFlow,
  sellHolding,
} from "@/lib/game-engine/ledger";

export interface PurchaseQuote {
  cashCost: number;
  loan: number;
  value: number;
  shares?: number;
  sharePrice?: number;
  passiveIncome: number;
  expense: number;
  laborIncome: number;
  kind: PlayerHolding["kind"];
}

export function quotePurchase(card: GameCard): PurchaseQuote {
  const effect = card.effect ?? {};
  const cashCost = numberOrZero(effect.downPayment ?? effect.cost);
  const loan = numberOrZero(effect.loan);
  const shares = effect.shares ? numberOrZero(effect.shares) : undefined;
  const sharePrice = effect.sharePrice
    ? numberOrZero(effect.sharePrice)
    : undefined;
  const passiveIncome = numberOrZero(effect.passiveIncome);
  const expense = numberOrZero(effect.expense);
  const laborIncome = numberOrZero(effect.laborIncome);

  let kind: PlayerHolding["kind"] = "other";
  let value = cashCost;

  if (shares && sharePrice) {
    kind = "stock";
    value = shares * sharePrice;
  } else if (loan > 0 || /房|公寓|宅|铺|楼/.test(card.name)) {
    kind = "property";
    value = cashCost + loan;
  } else if (laborIncome > 0 && passiveIncome === 0) {
    kind = "other";
    value = 0;
  } else if (/股|基金|票据|玉/.test(card.name)) {
    kind = "stock";
    value = cashCost;
  } else if (/公司|投资|集团|连锁|店|中心/.test(card.name)) {
    kind = "business";
    value = cashCost;
  }

  if (
    effect.assetMultiplier &&
    effect.assetMultiplier > 0 &&
    !(shares && sharePrice)
  ) {
    value = Math.round(value * effect.assetMultiplier);
  }

  return {
    cashCost,
    loan,
    value,
    shares: shares || undefined,
    sharePrice: sharePrice || undefined,
    passiveIncome,
    expense,
    laborIncome,
    kind,
  };
}

export function buildDecisionPreview(
  card: GameCard,
  state: PlayerRuntimeState
): DecisionPreview {
  const quote = quotePurchase(card);
  const parts: string[] = [];
  if (quote.cashCost > 0) {
    parts.push(`一次性支出 ${quote.cashCost.toLocaleString()} 元`);
  }
  if (quote.value > 0) {
    parts.push(`资产入账 ${quote.value.toLocaleString()} 元`);
  }
  if (quote.shares && quote.sharePrice) {
    parts.push(`${quote.shares} 股 × ${quote.sharePrice.toLocaleString()} 元`);
  }
  if (quote.laborIncome) {
    parts.push(`月薪 +${quote.laborIncome.toLocaleString()}`);
  }
  if (quote.passiveIncome) {
    parts.push(`被动收入 +${quote.passiveIncome.toLocaleString()}/月`);
  }
  if (quote.expense) parts.push(`月支出 +${quote.expense.toLocaleString()}`);
  if (quote.loan) parts.push(`新增负债 ${quote.loan.toLocaleString()}`);

  return {
    cost: quote.cashCost,
    laborIncomeDelta: quote.laborIncome || undefined,
    passiveIncomeDelta: quote.passiveIncome || undefined,
    expenseDelta: quote.expense || undefined,
    liabilityDelta: quote.loan || undefined,
    assetValueDelta: quote.value || undefined,
    canAfford: state.cash >= quote.cashCost,
    summary: parts.length ? parts.join("，") : "无财务变动",
  };
}

function holdingFromCard(card: GameCard, index: number): PlayerHolding {
  const quote = quotePurchase(card);
  return {
    id: `h_${card.id}_${index + 1}`,
    cardId: card.id,
    name: card.name,
    kind: quote.kind,
    value: quote.value,
    costBasis: quote.cashCost + quote.loan,
    shares: quote.shares,
    sharePrice: quote.sharePrice,
    passiveIncome: quote.passiveIncome,
    expense: quote.expense,
    loan: quote.loan,
  };
}

/** 应用参与决策后的卡牌效果（进修 / 机会 / 投资等） */
export function applyParticipationEffect(
  state: PlayerRuntimeState,
  card: GameCard
): PlayerRuntimeState {
  const current = ensureLedger(state);
  const quote = quotePurchase(card);
  if (current.cash < quote.cashCost) return current;

  const holding = holdingFromCard(card, current.holdings.length);
  const next = recalculateCashFlow({
    ...current,
    cash: current.cash - quote.cashCost,
    laborIncome: current.laborIncome + quote.laborIncome,
    holdings: quote.value > 0 || quote.passiveIncome > 0 || quote.loan > 0
      ? [...current.holdings, holding]
      : current.holdings,
  });
  return applyScoreEffects(next, card);
}

/** 应用风险卡（强制生效） */
export function applyRiskEffect(
  state: PlayerRuntimeState,
  card: GameCard
): { state: PlayerRuntimeState; message: string } {
  const effect = card.effect ?? {};
  let next = ensureLedger(state);
  const parts: string[] = [card.name];

  if (effect.cashDelta) {
    next = withCash(next, effect.cashDelta);
    parts.push(`现金 ${effect.cashDelta.toLocaleString()}`);
  }
  if (effect.payTotalExpense) {
    const pay = next.cashFlow.totalExpense;
    next = withCash(next, -pay);
    parts.push(`支付总支出 ${pay.toLocaleString()}`);
  }
  if (effect.percentCashLoss) {
    const loss = Math.round(next.cash * effect.percentCashLoss);
    next = withCash(next, -loss);
    parts.push(`损失现金 ${loss.toLocaleString()}`);
  }
  if (effect.percentIncomeLoss) {
    const loss = Math.round(next.cashFlow.laborIncome * effect.percentIncomeLoss);
    next = withCash(next, -loss);
    parts.push(`损失收入 ${loss.toLocaleString()}`);
  }
  if (effect.skipRound) {
    parts.push("停赛一轮");
  }

  return { state: next, message: `风险 · ${parts.join(" · ")}` };
}

export interface MarketApplyResult {
  state: PlayerRuntimeState;
  message: string;
  delta: number;
  pendingSale?: PendingDecision;
}

/** 应用市场信息卡：送股/缩股立即生效；有出价且持有对应资产时交给玩家决定是否出售 */
export function applyMarketEffect(
  state: PlayerRuntimeState,
  card: GameCard,
  tile?: BoardTile
): MarketApplyResult {
  const current = ensureLedger(state);
  const ticker = tickerOf(`${card.name} ${card.content}`);
  const split = splitDirection(card);

  if (split && ticker) {
    const changed = applySplit(current, ticker, split);
    if (!changed.touched) {
      return {
        state: current,
        delta: 0,
        message: `市场 · ${card.name} · 未持有 ${ticker}，股数不变`,
      };
    }
    return {
      state: changed.state,
      delta: changed.state.cashFlow.totalAssets - current.cashFlow.totalAssets,
      message: `市场 · ${card.name} · ${ticker} 股数${split === "up" ? "翻倍" : "减半"}`,
    };
  }

  const multiple = costMultiple(card);
  if (multiple) {
    const target = current.holdings.find((holding) =>
      /有限公司|有限合伙|股份制/.test(holding.name)
    );
    if (!target) {
      return {
        state: current,
        delta: 0,
        message: `市场 · ${card.name} · 没有可按成本价 ${multiple} 倍出售的公司股权`,
      };
    }
    return offerSale(current, card, target, Math.round(target.costBasis * multiple), tile);
  }

  const price = numberOrZero(card.effect?.marketPrice);
  if (price > 0) {
    const target = matchHolding(card, current.holdings);
    if (!target) {
      return {
        state: current,
        delta: 0,
        message: `市场 · ${card.name} · 没有可按 ${price.toLocaleString()} 出售的对应资产`,
      };
    }
    return offerSale(current, card, target, price, tile);
  }

  return {
    state: current,
    delta: 0,
    message: `市场 · ${card.name} · 没有可执行的出价或持股变动`,
  };
}

export function acceptPendingSale(
  state: PlayerRuntimeState,
  pending: PendingDecision
): { state: PlayerRuntimeState; sold: boolean; message: string } {
  if (!pending.sale) {
    return { state, sold: false, message: "没有待出售的资产" };
  }
  return sellHolding(state, pending.sale.holdingId, pending.sale.price);
}

/** 应用无需决策的卡牌（有钱有闲 / 品质生活等） */
export function applyPassiveCardEffect(
  state: PlayerRuntimeState,
  card: GameCard
): { state: PlayerRuntimeState; message: string } {
  const effect = card.effect ?? {};
  let next = ensureLedger(state);
  const parts: string[] = [card.name];

  if (effect.timePoints) {
    next = {
      ...next,
      timePoints: (next.timePoints ?? 0) + effect.timePoints,
    };
    parts.push(`时间积分 +${effect.timePoints}`);
  }
  if (effect.qualityPoints) {
    next = {
      ...next,
      qualityLifePoints: (next.qualityLifePoints ?? 0) + effect.qualityPoints,
    };
    parts.push(`品质积分 +${effect.qualityPoints}`);
  }
  if (effect.cashDelta) {
    next = withCash(next, effect.cashDelta);
    parts.push(`现金 ${effect.cashDelta.toLocaleString()}`);
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
  const effect = card.effect ?? {};
  let next = state;
  if (effect.timePoints) {
    next = {
      ...next,
      timePoints: (next.timePoints ?? 0) + effect.timePoints,
    };
  }
  if (effect.qualityPoints) {
    next = {
      ...next,
      qualityLifePoints: (next.qualityLifePoints ?? 0) + effect.qualityPoints,
    };
  }
  return next;
}

export function formatCardLog(card: GameCard, circle?: LifeCircle): string {
  return `[${card.code}] ${card.name}${circle ? ` · ${circle}圈` : ""}`;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function withCash(state: PlayerRuntimeState, delta: number) {
  return recalculateCashFlow({
    ...ensureLedger(state),
    cash: Math.max(0, state.cash + delta),
  });
}

function tickerOf(text: string): string | null {
  if (/UFO/i.test(text)) return "UFO";
  if (/007/.test(text)) return "007";
  if (/369/.test(text)) return "369";
  return null;
}

function splitDirection(card: GameCard): "up" | "down" | null {
  const text = `${card.name}\n${card.content}`;
  if (/翻番|送股|一股变两股|数量翻番/.test(text)) return "up";
  if (/减半|缩减|并成一股|权益减少|丑闻/.test(text)) return "down";
  return null;
}

function applySplit(
  state: PlayerRuntimeState,
  ticker: string,
  direction: "up" | "down"
): { state: PlayerRuntimeState; touched: boolean } {
  let touched = false;
  const holdings = state.holdings.map((holding) => {
    if (!holding.name.includes(ticker) || !holding.shares || !holding.sharePrice) {
      return holding;
    }
    touched = true;
    if (direction === "up") {
      const shares = holding.shares * 2;
      return { ...holding, shares, value: shares * holding.sharePrice };
    }
    const shares = Math.max(1, Math.floor(holding.shares / 2));
    const value = Math.round(holding.value / 2);
    return {
      ...holding,
      shares,
      value,
      sharePrice: shares > 0 ? value / shares : holding.sharePrice,
    };
  });
  if (!touched) return { state, touched: false };
  return { state: recalculateCashFlow({ ...state, holdings }), touched: true };
}

function costMultiple(card: GameCard): number | null {
  const matched = card.content.match(/成本价的\s*(\d+)\s*倍/);
  if (!matched) return null;
  const value = Number(matched[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

const MATCH_KEYS = [
  "三室二厅",
  "二室一厅",
  "公寓楼",
  "公寓",
  "4S店",
  "购物商场",
  "机械公司",
  "软件公司",
  "商务连锁酒店",
  "艺术培训",
  "旅游公司",
  "图书",
  "婚纱",
  "直销",
  "汽车美容",
  "饮食文化",
  "瑜伽",
  "动物园",
  "水果",
  "洗衣",
  "商务会所",
  "SPA",
  "房产中介",
  "健康餐厅",
  "鲜花",
  "面包",
  "股份制",
];

function normalizeAssetText(text: string) {
  return text
    .replace(/3室2厅/g, "三室二厅")
    .replace(/2室1厅/g, "二室一厅")
    .replace(/两室/g, "二室")
    .replace(/\s/g, "");
}

function keysIn(text: string) {
  const normalized = normalizeAssetText(text);
  return MATCH_KEYS.filter((key) => normalized.includes(key)).sort(
    (a, b) => b.length - a.length
  );
}

function matchHolding(card: GameCard, holdings: PlayerHolding[]) {
  const cardKeys = keysIn(card.name);
  const keys = cardKeys.length ? cardKeys : keysIn(card.content);
  let best: { holding: PlayerHolding; score: number } | undefined;
  for (const holding of holdings) {
    const overlap = keys.filter((key) =>
      normalizeAssetText(holding.name).includes(key)
    );
    if (!overlap.length) continue;
    const score = overlap[0]!.length;
    if (!best || score > best.score) best = { holding, score };
  }
  return best?.holding;
}

function offerSale(
  state: PlayerRuntimeState,
  card: GameCard,
  holding: PlayerHolding,
  price: number,
  tile?: BoardTile
): MarketApplyResult {
  const shortfall = Math.max(0, holding.loan - price);
  const net = price - holding.loan;
  const preview: DecisionPreview = {
    cost: shortfall,
    passiveIncomeDelta: holding.passiveIncome
      ? -holding.passiveIncome
      : undefined,
    expenseDelta: holding.expense ? -holding.expense : undefined,
    liabilityDelta: holding.loan ? -holding.loan : undefined,
    assetValueDelta: -holding.value,
    canAfford: shortfall <= state.cash,
    summary: `出售「${holding.name}」，成交 ${price.toLocaleString()}，清偿贷款 ${holding.loan.toLocaleString()}，净入账 ${net.toLocaleString()}`,
  };
  const pending: PendingDecision = {
    tileType: "market",
    tile: tile ?? {
      index: state.boardIndex,
      track: state.track,
      type: "market",
      label: "市场信息",
    },
    cardId: card.id,
    cardName: card.name,
    cardContent: card.content,
    preview,
    sale: { holdingId: holding.id, price },
  };
  return {
    state,
    delta: 0,
    message: preview.summary,
    pendingSale: pending,
  };
}

export type { CardEffect } from "./types";
