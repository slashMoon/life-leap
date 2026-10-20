import {
  DEFAULT_CORE_NET_WORTH_WAN,
  DEFAULT_CORE_PASSIVE_MULTIPLIER,
  INNER_TO_CORE_RULES,
  OUTER_TO_INNER_RULES,
  coreNetWorthYuan,
} from "@/lib/constants/circle-rules";
import type { CashFlowSnapshot, LifeCircle } from "@/types/game";

export interface CircleRuleOverrides {
  /** 净资产门槛，单位：万 */
  coreNetWorthThreshold?: number;
  corePassiveIncomeMultiplier?: number;
}

export interface CircleTransitionContext extends CircleRuleOverrides {
  circle: LifeCircle;
  cashFlow: CashFlowSnapshot;
}

export interface CircleTransitionResult {
  changed: boolean;
  from: LifeCircle;
  to: LifeCircle;
  reason?: string;
  /** 未满足的条件（用于 UI 提示） */
  blockers?: string[];
}

export interface CircleTransitionProgress {
  target: LifeCircle | null;
  ruleTitle: string;
  items: { label: string; current: string; required: string; met: boolean }[];
}

const CIRCLE_ORDER: LifeCircle[] = ["牛马", "老板", "核心"];

export function resolveCoreThresholds(rules?: CircleRuleOverrides) {
  const netWorthWan = rules?.coreNetWorthThreshold ?? DEFAULT_CORE_NET_WORTH_WAN;
  const passiveIncomeMultiplier =
    rules?.corePassiveIncomeMultiplier ?? DEFAULT_CORE_PASSIVE_MULTIPLIER;
  return {
    netWorthWan,
    netWorth: coreNetWorthYuan(netWorthWan),
    passiveIncomeMultiplier,
  };
}

function evaluateOuterToInner(ctx: CircleTransitionContext): {
  ok: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  const passiveOk = ctx.cashFlow.passiveIncome > ctx.cashFlow.totalExpense;

  if (!passiveOk) {
    blockers.push(
      `非劳动收入需大于总支出（当前 ${ctx.cashFlow.passiveIncome.toLocaleString()} / ${ctx.cashFlow.totalExpense.toLocaleString()}）`
    );
  }

  return { ok: passiveOk, blockers };
}

function evaluateInnerToCore(ctx: CircleTransitionContext): {
  ok: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  const rules = resolveCoreThresholds(ctx);
  const netWorthOk = ctx.cashFlow.netWorth >= rules.netWorth;
  const passiveOk =
    ctx.cashFlow.passiveIncome >=
    ctx.cashFlow.totalExpense * rules.passiveIncomeMultiplier;

  if (!netWorthOk) {
    blockers.push(
      `净资产需 ≥ ${rules.netWorthWan} 万（当前 ${(ctx.cashFlow.netWorth / 10_000).toFixed(1)} 万）`
    );
  }
  if (!passiveOk) {
    blockers.push(
      `被动收入需 ≥ 总支出 × ${rules.passiveIncomeMultiplier}（当前 ${ctx.cashFlow.passiveIncome.toLocaleString()} / ${ctx.cashFlow.totalExpense.toLocaleString()}）`
    );
  }

  return { ok: netWorthOk && passiveOk, blockers };
}

/**
 * 圈层跃迁判定（与 README 一致）
 * - 牛马 → 老板：非劳动收入 > 总支出
 * - 老板 → 核心：净资产 ≥ 门槛（默认 200 万）且被动收入 ≥ 总支出 × 倍数（默认 2）
 */
export function evaluateCircleTransition(
  ctx: CircleTransitionContext
): CircleTransitionResult {
  const from = ctx.circle;
  let to: LifeCircle = from;
  let blockers: string[] | undefined;

  if (from === "牛马") {
    const check = evaluateOuterToInner(ctx);
    if (check.ok) to = "老板";
    else blockers = check.blockers;
  } else if (from === "老板") {
    const check = evaluateInnerToCore(ctx);
    if (check.ok) to = "核心";
    else blockers = check.blockers;
  }

  const changed = to !== from;
  return {
    changed,
    from,
    to,
    reason: changed ? `满足 ${from} → ${to} 跃迁条件` : undefined,
    blockers: changed ? undefined : blockers,
  };
}

export function getCircleTransitionProgress(
  ctx: CircleTransitionContext
): CircleTransitionProgress | null {
  if (ctx.circle === "核心") return null;

  if (ctx.circle === "牛马") {
    return {
      target: "老板",
      ruleTitle: OUTER_TO_INNER_RULES.title,
      items: [
        {
          label: "非劳动收入 > 总支出",
          current: `${ctx.cashFlow.passiveIncome.toLocaleString()} / ${ctx.cashFlow.totalExpense.toLocaleString()}`,
          required: ">",
          met: ctx.cashFlow.passiveIncome > ctx.cashFlow.totalExpense,
        },
      ],
    };
  }

  const rules = resolveCoreThresholds(ctx);
  return {
    target: "核心",
    ruleTitle: INNER_TO_CORE_RULES.title,
    items: [
      {
        label: "净资产",
        current: `${(ctx.cashFlow.netWorth / 10_000).toFixed(1)} 万`,
        required: `≥ ${rules.netWorthWan} 万`,
        met: ctx.cashFlow.netWorth >= rules.netWorth,
      },
      {
        label: `被动收入 ≥ 总支出 × ${rules.passiveIncomeMultiplier}`,
        current: `${ctx.cashFlow.passiveIncome.toLocaleString()} / ${ctx.cashFlow.totalExpense.toLocaleString()}`,
        required: `≥ ${rules.passiveIncomeMultiplier}×`,
        met:
          ctx.cashFlow.passiveIncome >=
          ctx.cashFlow.totalExpense * rules.passiveIncomeMultiplier,
      },
    ],
  };
}

export function getNextCircle(current: LifeCircle): LifeCircle | null {
  const idx = CIRCLE_ORDER.indexOf(current);
  if (idx < 0 || idx >= CIRCLE_ORDER.length - 1) return null;
  return CIRCLE_ORDER[idx + 1];
}

export function buildTransitionContext(
  state: Pick<
    import("@/types/player").PlayerRuntimeState,
    "circle" | "cashFlow" | "coreNetWorthThreshold" | "corePassiveIncomeMultiplier"
  >
): CircleTransitionContext {
  return {
    circle: state.circle,
    cashFlow: state.cashFlow,
    coreNetWorthThreshold: state.coreNetWorthThreshold,
    corePassiveIncomeMultiplier: state.corePassiveIncomeMultiplier,
  };
}
