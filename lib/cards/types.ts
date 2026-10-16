/** 卡牌类型（对应 Excel 分类 + 游戏格子） */
export type GameCardType =
  | "small"
  | "big"
  | "market"
  | "risk"
  | "study"
  | "investment"
  | "wealth_leisure"
  | "quality_life";

export interface CardEffect {
  cost?: number;
  downPayment?: number;
  loan?: number;
  passiveIncome?: number;
  laborIncome?: number;
  expense?: number;
  cashDelta?: number;
  assetMultiplier?: number;
  marketPrice?: number;
  marketEvent?: boolean;
  qualityPoints?: number;
  timePoints?: number;
  skipRound?: boolean;
  payTotalExpense?: boolean;
  percentCashLoss?: number;
  percentIncomeLoss?: number;
  sharePrice?: number;
  shares?: number;
}

export interface GameCard {
  id: string;
  type: GameCardType;
  category: string;
  code: string;
  circle: string;
  name: string;
  content: string;
  effect: CardEffect;
  status: boolean;
}
