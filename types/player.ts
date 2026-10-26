import type { BoardTile, CashFlowSnapshot, LifeCircle } from "@/types/game";
import type { IdentityId, IdentityTier, NativeLiabilities } from "@/types/identity";

/** 玩家决策预览（进修 / 机会 / 出售等） */
export interface DecisionPreview {
  cost: number;
  laborIncomeDelta?: number;
  passiveIncomeDelta?: number;
  expenseDelta?: number;
  liabilityDelta?: number;
  /** 入账或出售的资产市值变化 */
  assetValueDelta?: number;
  canAfford: boolean;
  summary: string;
}

/** 持有资产（房产、股票、生意等），市值计入总资产 */
export interface PlayerHolding {
  id: string;
  cardId: string;
  name: string;
  kind: "property" | "stock" | "business" | "other";
  /** 当前市值 */
  value: number;
  /** 取得成本（现金出资 + 配套贷款，或股价 × 股数） */
  costBasis: number;
  shares?: number;
  sharePrice?: number;
  passiveIncome: number;
  expense: number;
  /** 绑定在该资产上的贷款 */
  loan: number;
}

/** 市场出价：玩家可选择出售一笔持仓 */
export interface PendingSale {
  holdingId: string;
  price: number;
}

/** 待玩家确认的决策 */
export interface PendingDecision {
  tileType:
    | "opportunity"
    | "study"
    | "investment"
    | "wealth_leisure"
    | "quality_life"
    | "market";
  tile: BoardTile;
  cardId: string;
  cardName: string;
  cardContent: string;
  preview: DecisionPreview;
  /** 市场格的可选出售 */
  sale?: PendingSale;
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
  /** 月劳动收入（账本字段，现金流由此汇总） */
  laborIncome: number;
  /** 与持仓无关的月支出（身份支出、子女等） */
  baseExpense: number;
  holdings: PlayerHolding[];
  cashFlow: CashFlowSnapshot;
  /** 老板→核心：净资产门槛，单位万。缺省 200 */
  coreNetWorthThreshold?: number;
  /** 老板→核心：被动收入相对总支出的倍数。缺省 2 */
  corePassiveIncomeMultiplier?: number;
  identityId?: IdentityId;
  identityName?: string;
  identityTier?: IdentityTier;
  nativeLiabilities?: NativeLiabilities;
  childrenCount?: number;
  childExpensePerChild?: number;
  /** 进入当前圈层时的现金（记录用，不作为跃迁门槛） */
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
  laborIncome: 12000,
  baseExpense: 8630,
  holdings: [],
  coreNetWorthThreshold: 200,
  corePassiveIncomeMultiplier: 2,
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
