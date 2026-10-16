import type { LifeCircle } from "@/types/game";

/** 牛马圈 → 老板圈：财务自由 */
export const OUTER_TO_INNER_RULES = {
  title: "财务自由（外圈进入内圈）",
  /** 非劳务收入 > 总支出 */
  requirePassiveIncomeGtExpense: true,
  /** 无负债 */
  requireNoDebt: true,
} as const;

/** 老板圈 → 核心圈：身心自由 */
export const INNER_TO_CORE_RULES = {
  title: "身心自由（内圈进入核心圈）",
  /** 进入老板圈后现金增加（元） */
  liquidCashGain: 200_000,
  /** 时间累计分 */
  timePoints: 1000,
  /** 品质生活累计分 */
  qualityLifePoints: 100,
  /** 无银行贷款 */
  requireNoBankLoan: true,
  /** 无负债 */
  requireNoDebt: true,
} as const;

/** 牛马圈：银行贷款上限 = 流动现金 × 倍数，1000 元递增，年利率按结账日 10% */
export const OUTER_BANK_LOAN = {
  multiplier: 10,
  step: 1000,
  interestRate: 0.1,
} as const;

/** 牛马圈：信用卡透支上限与结账日利率 */
export const OUTER_CREDIT_CARD = {
  limit: 10_000,
  interestRate: 0.03,
} as const;

/** 老板圈：银行贷款上限 = 流动现金 × 倍数，结账日利率 1% */
export const INNER_BANK_LOAN = {
  multiplier: 100,
  interestRate: 0.01,
} as const;

/** 进修 / 慈善 / 健康管理：支付总收入 10% 获得风火轮（下回合 3 骰） */
export const WIND_FIRE_WHEEL_INCOME_RATE = 0.1;

export const CIRCLE_ORDER: LifeCircle[] = ["牛马", "老板", "核心"];

export const CIRCLE_TRANSITION_LABELS: Record<
  LifeCircle,
  { next: LifeCircle | null; ruleTitle: string }
> = {
  牛马: { next: "老板", ruleTitle: OUTER_TO_INNER_RULES.title },
  老板: { next: "核心", ruleTitle: INNER_TO_CORE_RULES.title },
  核心: { next: null, ruleTitle: "已达核心圈" },
};
