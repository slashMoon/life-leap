import type { LifeCircle } from "@/types/game";

/**
 * 跃迁规则与 README、`人生跃迁游戏文档.md` §5.3 一致。
 * 不把「无负债 / 时间积分 / 品质积分」当作门槛。
 * `技术方案文档.md` 里的「人生意义前置任务」也不在当前对局里判定。
 */
export const OUTER_TO_INNER_RULES = {
  title: "财务自由（牛马圈 → 老板圈）",
  /** 非劳动收入 > 总支出 */
  requirePassiveIncomeGtExpense: true,
} as const;

/** 房间未另行配置时的核心圈门槛，与 RoomConfig 默认值一致 */
export const DEFAULT_CORE_NET_WORTH_WAN = 200;
export const DEFAULT_CORE_PASSIVE_MULTIPLIER = 2;

/** 老板圈 → 核心圈。净资产单位是元，由「万」换算 */
export const INNER_TO_CORE_RULES = {
  title: "财务安全（老板圈 → 核心圈）",
  netWorth: DEFAULT_CORE_NET_WORTH_WAN * 10_000,
  passiveIncomeMultiplier: DEFAULT_CORE_PASSIVE_MULTIPLIER,
} as const;

export function coreNetWorthYuan(thresholdWan: number): number {
  return thresholdWan * 10_000;
}

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
