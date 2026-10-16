import type { BoardTile, CashFlowSnapshot, LifeCircle } from "@/types/game";
import type { IdentityId, IdentityTier, NativeLiabilities } from "@/types/identity";

/** 玩家决策预览（进修 / 机会等） */
export interface DecisionPreview {
  cost: number;
  laborIncomeDelta?: number;
  passiveIncomeDelta?: number;
  expenseDelta?: number;
  liabilityDelta?: number;
  canAfford: boolean;
  summary: string;
}

/** 待玩家确认的决策 */
export interface PendingDecision {
  tileType:
    | "opportunity"
    | "study"
    | "investment"
    | "wealth_leisure"
    | "quality_life";
  tile: BoardTile;
  cardId: string;
  cardName: string;
  cardContent: string;
  preview: DecisionPreview;
}

export interface TileEventResult {
  message: string;
  cardTitle?: string;
  cardContent?: string;
  cashFlow: CashFlowSnapshot;
  circle?: LifeCircle;
  roundDelta?: number;
  requiresDecision?: boolean;
  preview?: DecisionPreview;
}

export interface PlayerRuntimeState {
  track: "outer" | "inner";
  boardIndex: number;
  circle: LifeCircle;
  round: number;
  cash: number;
  cashFlow: CashFlowSnapshot;
  identityId?: IdentityId;
  identityName?: string;
  identityTier?: IdentityTier;
  nativeLiabilities?: NativeLiabilities;
  childrenCount?: number;
  childExpensePerChild?: number;
  /** 进入当前圈层时的现金（老板→核心：现金 +20 万判定） */
  cashAtCircleEntry?: number;
  /** 时间积分（有钱有闲） */
  timePoints?: number;
  /** 品质生活积分（品生活） */
  qualityLifePoints?: number;
  /** 银行贷款余额 */
  bankLoan?: number;
  /** 信用卡透支 */
  creditCardDebt?: number;
  /** 下回合风火轮：掷 3 骰 */
  windFireWheel?: boolean;
  /** 离婚等事件用 */
  gender?: "male" | "female";
  lastDice: number | null;
  lastTile: BoardTile | null;
  lastEvent: TileEventResult | null;
  pendingDecision: PendingDecision | null;
  eventLog: string[];
}

export const DEFAULT_PLAYER_STATE: PlayerRuntimeState = {
  track: "outer",
  boardIndex: 0,
  circle: "牛马",
  round: 1,
  cash: 3870,
  cashFlow: {
    laborIncome: 12000,
    passiveIncome: 0,
    totalExpense: 8630,
    cashFlow: 3370,
    netWorth: -209630,
    totalAssets: 3870,
    totalLiabilities: 213500,
  },
  identityId: "doctor",
  identityName: "医生",
  identityTier: "high",
  nativeLiabilities: {
    housingMortgage: 166000,
    educationLoan: 0,
    carLoan: 18750,
    creditCard: 27500,
    extra: 1250,
  },
  childrenCount: 0,
  childExpensePerChild: 480,
  cashAtCircleEntry: 3870,
  timePoints: 0,
  qualityLifePoints: 0,
  bankLoan: 0,
  creditCardDebt: 0,
  windFireWheel: false,
  lastDice: null,
  lastTile: null,
  lastEvent: null,
  pendingDecision: null,
  eventLog: ["游戏开始 · 医生 · 牛马圈 · 起点结账日"],
};
