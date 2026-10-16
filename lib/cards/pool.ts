import type { BoardTile, LifeCircle } from "@/types/game";
import type { CardEffect, GameCard, GameCardType } from "./types";
import gameCardsJson from "./game-cards.json";

export const ALL_GAME_CARDS: GameCard[] = gameCardsJson as GameCard[];

const cardsByType = new Map<GameCardType, GameCard[]>();
for (const card of ALL_GAME_CARDS) {
  const list = cardsByType.get(card.type) ?? [];
  list.push(card);
  cardsByType.set(card.type, list);
}

/** 玩家圈层是否匹配卡牌适用圈层 */
export function matchesCircle(card: GameCard, circle: LifeCircle): boolean {
  const c = card.circle;
  if (!c || c.includes("全圈层") || c.includes("通用")) return true;
  if (circle === "牛马" && c.includes("牛马")) return true;
  if (circle === "老板" && c.includes("老板")) return true;
  if (circle === "核心" && (c.includes("核心") || c.includes("老板"))) return true;
  return false;
}

export interface PickCardOptions {
  circle?: LifeCircle;
  track?: "outer" | "inner";
}

/** 从指定类型牌堆随机抽一张 */
export function pickCard(
  type: GameCardType,
  options: PickCardOptions = {}
): GameCard {
  let pool = (cardsByType.get(type) ?? []).filter((c) => c.status);
  if (!pool.length) {
    throw new Error(`卡牌池为空: ${type}`);
  }

  if (options.circle) {
    const matched = pool.filter((c) => matchesCircle(c, options.circle!));
    if (matched.length) pool = matched;
  }

  if (type === "study") {
    if (options.track === "inner") {
      const inner = pool.filter(
        (c) => c.circle.includes("老板") || c.circle.includes("核心")
      );
      if (inner.length) pool = inner;
    } else if (options.track === "outer") {
      const outer = pool.filter(
        (c) => c.circle.includes("牛马") || c.id.includes("outer")
      );
      if (outer.length) pool = outer;
    }
  }

  return pool[Math.floor(Math.random() * pool.length)]!;
}

/** 机会格：牛马圈抽小机会，老板/核心圈抽大机会 */
export function pickOpportunityCard(
  circle: LifeCircle,
  options: PickCardOptions = {}
): GameCard {
  const type: GameCardType = circle === "牛马" ? "small" : "big";
  return pickCard(type, { ...options, circle });
}

/** 根据棋盘格子类型映射卡牌类型 */
export function tileToCardType(
  tile: BoardTile,
  circle: LifeCircle
): GameCardType | null {
  switch (tile.type) {
    case "opportunity":
      return circle === "牛马" ? "small" : "big";
    case "risk":
      return "risk";
    case "market":
      return "market";
    case "study":
      return "study";
    case "investment":
      return "investment";
    case "wealth_leisure":
      return "wealth_leisure";
    case "quality_life":
      return "quality_life";
    default:
      return null;
  }
}

/** 为格子抽一张对应卡牌 */
export function pickCardForTile(
  tile: BoardTile,
  circle: LifeCircle,
  track: "outer" | "inner"
): GameCard | null {
  if (tile.type === "opportunity") {
    return pickOpportunityCard(circle, { circle, track });
  }
  const cardType = tileToCardType(tile, circle);
  if (!cardType) return null;
  return pickCard(cardType, { circle, track });
}

export function getCardById(id: string): GameCard | undefined {
  return ALL_GAME_CARDS.find((c) => c.id === id);
}

export function listCardsByType(type?: GameCardType): GameCard[] {
  if (!type) return ALL_GAME_CARDS.filter((c) => c.status);
  return (cardsByType.get(type) ?? []).filter((c) => c.status);
}

/** 卡牌是否需要玩家决策（有投入或收益变更） */
export function cardRequiresDecision(card: GameCard): boolean {
  const e = card.effect;
  return !!(
    e.cost ||
    e.downPayment ||
    e.laborIncome ||
    e.passiveIncome ||
    e.loan
  );
}

export function getParticipationCost(effect: CardEffect): number {
  return Number(effect.cost ?? effect.downPayment ?? 0);
}

export function cardTypeLabel(type: GameCardType | string): string {
  const labels: Record<string, string> = {
    small: "小机会",
    big: "大机会",
    market: "市场信息",
    risk: "风险",
    study: "进修学习",
    investment: "投资",
    wealth_leisure: "有钱有闲",
    quality_life: "品质生活",
  };
  return labels[type] ?? "卡牌";
}
