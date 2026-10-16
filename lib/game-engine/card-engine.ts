import type { GameCardType } from "@/lib/cards/types";

export type CardDeckType = GameCardType;

/** 洗牌（Fisher-Yates） */
export function shuffleDeck<T>(deck: T[]): T[] {
  const arr = [...deck];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 根据格子类型映射抽牌堆（机会格需结合圈层在 pool 中处理） */
export function mapTileToDeckType(tileType: string): CardDeckType | null {
  const map: Record<string, CardDeckType> = {
    opportunity: "small",
    risk: "risk",
    market: "market",
    study: "study",
    investment: "investment",
    wealth_leisure: "wealth_leisure",
    quality_life: "quality_life",
  };
  return map[tileType] ?? null;
}
