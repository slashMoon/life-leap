/** 身份阶层：低产 / 中产 / 高产 */
export type IdentityTier = "low" | "middle" | "high";

export type IdentityId =
  | "doctor"
  | "lawyer"
  | "sales_manager"
  | "it_technician"
  | "driver"
  | "security_guard";

/** 原生负债明细（记账表） */
export interface NativeLiabilities {
  housingMortgage: number;
  educationLoan: number;
  carLoan: number;
  creditCard: number;
  extra: number;
}

export interface GameIdentity {
  id: IdentityId;
  tier: IdentityTier;
  order: number;
  name: string;
  /** 银行储蓄 */
  bankSavings: number;
  /** 月工资 */
  salary: number;
  /** 月总支出（不含小孩，0 孩起步） */
  totalExpense: number;
  /** 月流动现金 = 收入 - 支出 */
  liquidCash: number;
  /** 每个孩子的月支出 */
  childExpensePerChild: number;
  nativeLiabilities: NativeLiabilities;
}

export type RoomPlayerRole = "player" | "banker";

export const IDENTITY_TIER_LABELS: Record<IdentityTier, string> = {
  low: "低产",
  middle: "中产",
  high: "高产",
};

/** 棋盘玩家人数（不含银行家） */
export const MIN_BOARD_PLAYERS = 3;
/** Mock / 单人试玩最少玩家数 */
export const MOCK_MIN_BOARD_PLAYERS = 1;
export const MAX_BOARD_PLAYERS = 8;
/** 房间总人数上限（1 名银行家 + 棋盘玩家） */
export const MAX_ROOM_OCCUPANTS = MAX_BOARD_PLAYERS + 1;
