import {
  INNER_TO_CORE_RULES,
  OUTER_TO_INNER_RULES,
} from "@/lib/constants/circle-rules";
import type { CashFlowSnapshot, LifeCircle } from "@/types/game";

export interface CircleTransitionContext {
  circle: LifeCircle;
  cashFlow: CashFlowSnapshot;
  cash: number;
  cashAtCircleEntry: number;
  timePoints: number;
  qualityLifePoints: number;
  bankLoan: number;
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

function evaluateOuterToInner(ctx: CircleTransitionContext): {
  ok: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  const passiveOk =
    ctx.cashFlow.passiveIncome > ctx.cashFlow.totalExpense;
  const debtOk = ctx.cashFlow.totalLiabilities <= 0;

  if (!passiveOk) {
    blockers.push(
      `非劳务收入需大于总支出（当前 ${ctx.cashFlow.passiveIncome.toLocaleString()} / ${ctx.cashFlow.totalExpense.toLocaleString()}）`
    );
  }
  if (!debtOk) {
    blockers.push(
      `需无负债（当前负债 ${ctx.cashFlow.totalLiabilities.toLocaleString()}）`
    );
  }

  return { ok: passiveOk && debtOk, blockers };
}

function evaluateInnerToCore(ctx: CircleTransitionContext): {
  ok: boolean;
  blockers: string[];
} {
  const blockers: string[] = [];
  const cashGain = ctx.cash - ctx.cashAtCircleEntry;
  const gainOk = cashGain >= INNER_TO_CORE_RULES.liquidCashGain;
  const timeOk = ctx.timePoints >= INNER_TO_CORE_RULES.timePoints;
  const qualityOk =
    ctx.qualityLifePoints >= INNER_TO_CORE_RULES.qualityLifePoints;
  const bankLoanOk = ctx.bankLoan <= 0;
  const debtOk = ctx.cashFlow.totalLiabilities <= 0;

  if (!gainOk) {
    blockers.push(
      `现金需增加 ${INNER_TO_CORE_RULES.liquidCashGain.toLocaleString()}（当前 +${Math.max(0, cashGain).toLocaleString()}）`
    );
  }
  if (!timeOk) {
    blockers.push(
      `时间积分需 ${INNER_TO_CORE_RULES.timePoints}（当前 ${ctx.timePoints}）`
    );
  }
  if (!qualityOk) {
    blockers.push(
      `品质生活积分需 ${INNER_TO_CORE_RULES.qualityLifePoints}（当前 ${ctx.qualityLifePoints}）`
    );
  }
  if (!bankLoanOk) {
    blockers.push(`需无银行贷款（当前 ${ctx.bankLoan.toLocaleString()}）`);
  }
  if (!debtOk) {
    blockers.push(
      `需无负债（当前 ${ctx.cashFlow.totalLiabilities.toLocaleString()}）`
    );
  }

  return {
    ok: gainOk && timeOk && qualityOk && bankLoanOk && debtOk,
    blockers,
  };
}

/**
 * 圈层跃迁判定（按游戏规则图）
 * - 牛马 → 老板：非劳务收入 > 总支出，且无负债
 * - 老板 → 核心：现金 +20 万、时间 1000 分、品质生活 100 分，且无银行贷款、无负债
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
    const check = evaluateOuterToInner(ctx);
    return {
      target: "老板",
      ruleTitle: OUTER_TO_INNER_RULES.title,
      items: [
        {
          label: "非劳务收入 > 总支出",
          current: `${ctx.cashFlow.passiveIncome.toLocaleString()} / ${ctx.cashFlow.totalExpense.toLocaleString()}`,
          required: ">",
          met: ctx.cashFlow.passiveIncome > ctx.cashFlow.totalExpense,
        },
        {
          label: "无负债",
          current: ctx.cashFlow.totalLiabilities.toLocaleString(),
          required: "0",
          met: ctx.cashFlow.totalLiabilities <= 0,
        },
      ],
    };
  }

  const cashGain = Math.max(0, ctx.cash - ctx.cashAtCircleEntry);
  return {
    target: "核心",
    ruleTitle: INNER_TO_CORE_RULES.title,
    items: [
      {
        label: "现金增加",
        current: `+${cashGain.toLocaleString()}`,
        required: `+${INNER_TO_CORE_RULES.liquidCashGain.toLocaleString()}`,
        met: cashGain >= INNER_TO_CORE_RULES.liquidCashGain,
      },
      {
        label: "时间积分",
        current: String(ctx.timePoints),
        required: String(INNER_TO_CORE_RULES.timePoints),
        met: ctx.timePoints >= INNER_TO_CORE_RULES.timePoints,
      },
      {
        label: "品质生活积分",
        current: String(ctx.qualityLifePoints),
        required: String(INNER_TO_CORE_RULES.qualityLifePoints),
        met: ctx.qualityLifePoints >= INNER_TO_CORE_RULES.qualityLifePoints,
      },
      {
        label: "无银行贷款",
        current: ctx.bankLoan.toLocaleString(),
        required: "0",
        met: ctx.bankLoan <= 0,
      },
      {
        label: "无负债",
        current: ctx.cashFlow.totalLiabilities.toLocaleString(),
        required: "0",
        met: ctx.cashFlow.totalLiabilities <= 0,
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
    | "circle"
    | "cashFlow"
    | "cash"
    | "cashAtCircleEntry"
    | "timePoints"
    | "qualityLifePoints"
    | "bankLoan"
  >
): CircleTransitionContext {
  return {
    circle: state.circle,
    cashFlow: state.cashFlow,
    cash: state.cash,
    cashAtCircleEntry: state.cashAtCircleEntry ?? state.cash,
    timePoints: state.timePoints ?? 0,
    qualityLifePoints: state.qualityLifePoints ?? 0,
    bankLoan: state.bankLoan ?? 0,
  };
}
