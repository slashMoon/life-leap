import {
  INNER_BANK_LOAN,
  OUTER_BANK_LOAN,
  OUTER_CREDIT_CARD,
  WIND_FIRE_WHEEL_INCOME_RATE,
} from "@/lib/constants/circle-rules";
import type { BoardTile } from "@/types/game";
import {
  DEFAULT_PLAYER_STATE,
  type PlayerRuntimeState,
  type TileEventResult,
} from "@/types/player";
import { createPlayerStateFromIdentity } from "@/lib/constants/identities";
import { getSelectedIdentity } from "@/lib/client/identity";
import type { IdentityId } from "@/types/identity";
import {
  applyMarketEffect,
  applyPassiveCardEffect,
  applyRiskEffect,
} from "@/lib/cards/apply-effect";
import { pickCardForTile } from "@/lib/cards/pool";
import {
  buildCardRevealEvent,
  buildPendingDecision,
  cardRequiresDecision,
  createDecisionEvent,
  isDecisionTile,
} from "./decisions";
import { recalculateCashFlow } from "./ledger";
import {
  appendLog,
  finalizeEvent,
  withCashFlow,
} from "./player-finance";

function totalIncome(state: PlayerRuntimeState) {
  return state.cashFlow.laborIncome + state.cashFlow.passiveIncome;
}

/** 结账日：领取流动现金 + 贷款/信用卡利息 */
function applySettlement(state: PlayerRuntimeState): {
  state: PlayerRuntimeState;
  event: TileEventResult;
} {
  let next = state;
  const parts: string[] = [];
  const income = next.cashFlow.cashFlow;

  const bankLoan = next.bankLoan ?? 0;
  const creditDebt = next.creditCardDebt ?? 0;
  const isInner = next.circle === "老板" || next.circle === "核心";
  const bankRate = isInner
    ? INNER_BANK_LOAN.interestRate
    : OUTER_BANK_LOAN.interestRate;
  const cardRate = OUTER_CREDIT_CARD.interestRate;

  let interest = 0;
  if (bankLoan > 0) {
    const bankInterest = Math.round(bankLoan * bankRate);
    interest += bankInterest;
    next = {
      ...next,
      bankLoan: bankLoan + bankInterest,
    };
    parts.push(`银行贷款利息 +${bankInterest.toLocaleString()}`);
  }
  if (creditDebt > 0) {
    const cardInterest = Math.round(creditDebt * cardRate);
    interest += cardInterest;
    next = {
      ...next,
      creditCardDebt: creditDebt + cardInterest,
    };
    parts.push(`信用卡利息 +${cardInterest.toLocaleString()}`);
  }

  next = recalculateCashFlow({
    ...next,
    cash: Math.max(0, next.cash + income - interest),
  });
  parts.unshift(
    `流动现金 ${income >= 0 ? "+" : ""}${income.toLocaleString()}`
  );

  next = appendLog(next, `第 ${next.round} 回合结账`);
  next = { ...next, round: next.round + 1 };

  return {
    state: next,
    event: {
      message: `结账日：${parts.join(" · ")}`,
      cashFlow: next.cashFlow,
      roundDelta: 1,
    },
  };
}

/** 牛马圈：进修/慈善/健康管理 — 支付总收入 10% 获风火轮 */
function applyWindFireWheelTile(
  state: PlayerRuntimeState,
  tile: BoardTile
): { state: PlayerRuntimeState; event: TileEventResult } {
  const pay = Math.round(totalIncome(state) * WIND_FIRE_WHEEL_INCOME_RATE);
  const next = appendLog(
    {
      ...withCashFlow(state, {}, -pay),
      windFireWheel: true,
    },
    `${tile.label} · 风火轮`
  );
  return {
    state: next,
    event: {
      message: `${tile.label}：支付总收入 10%（${pay.toLocaleString()} 元）获得风火轮，下回合掷 3 骰`,
      cashFlow: next.cashFlow,
    },
  };
}

function isOuterOxCircle(state: PlayerRuntimeState) {
  return state.circle === "牛马" && state.track === "outer";
}

export function applyTileEffect(
  state: PlayerRuntimeState,
  tile: BoardTile
): PlayerRuntimeState {
  let next: PlayerRuntimeState = { ...state, lastTile: tile };

  if (isDecisionTile(tile.type)) {
    const card = pickCardForTile(tile, next.circle, next.track);
    if (card) {
      if (cardRequiresDecision(card)) {
        const pending = buildPendingDecision(next, tile, card);
        const event = createDecisionEvent(pending, next.cashFlow);
        return { ...next, pendingDecision: pending, lastEvent: event };
      }
      const { state: after, message } = applyPassiveCardEffect(next, card);
      next = appendLog(after, message);
      return finalizeEvent(
        next,
        buildCardRevealEvent(card, tile, after.cashFlow, message)
      );
    }
  }

  let event: TileEventResult;

  switch (tile.type) {
    case "settlement": {
      const result = applySettlement(next);
      next = result.state;
      event = result.event;
      break;
    }
    case "risk": {
      const card = pickCardForTile(tile, next.circle, next.track);
      if (card) {
        const result = applyRiskEffect(next, card);
        next = appendLog(result.state, result.message);
        event = {
          message: result.message,
          cardTitle: card.name,
          cardContent: card.content,
          cashFlow: next.cashFlow,
        };
      } else {
        next = withCashFlow(next, {}, -5000);
        event = { message: "风险：意外支出 -5,000", cashFlow: next.cashFlow };
        next = appendLog(next, "风险");
      }
      break;
    }
    case "market": {
      const card = pickCardForTile(tile, next.circle, next.track);
      if (card) {
        const result = applyMarketEffect(next, card, tile);
        if (result.pendingSale) {
          return {
            ...result.state,
            pendingDecision: result.pendingSale,
            lastEvent: createDecisionEvent(result.pendingSale, result.state.cashFlow),
          };
        }
        next = appendLog(result.state, result.message);
        event = {
          message: result.message,
          cardTitle: card.name,
          cardContent: card.content,
          cashFlow: next.cashFlow,
        };
      } else {
        event = {
          message: "市场信息：没有抽到可执行的报价",
          cashFlow: next.cashFlow,
        };
        next = appendLog(next, event.message);
      }
      break;
    }
    case "child": {
      const childCost = next.childExpensePerChild ?? 2000;
      next = withCashFlow(next, {
        totalExpense: next.cashFlow.totalExpense + childCost,
      });
      next = {
        ...next,
        childrenCount: (next.childrenCount ?? 0) + 1,
      };
      event = {
        message: `生孩子：月支出 +${childCost.toLocaleString()}（共 ${next.childrenCount} 孩）`,
        cashFlow: next.cashFlow,
      };
      next = appendLog(next, "生孩子");
      break;
    }
    case "health":
      if (isOuterOxCircle(next)) {
        const result = applyWindFireWheelTile(next, tile);
        next = result.state;
        event = result.event;
        break;
      }
      next = withCashFlow(next, {}, -3000);
      event = {
        message: `${tile.label}：支出 3,000`,
        cashFlow: next.cashFlow,
      };
      next = appendLog(next, tile.label);
      break;
    case "charity":
      if (isOuterOxCircle(next)) {
        const result = applyWindFireWheelTile(next, tile);
        next = result.state;
        event = result.event;
        break;
      }
      next = withCashFlow(next, {}, -5000);
      event = { message: "慈善公益：-5,000", cashFlow: next.cashFlow };
      next = appendLog(next, "慈善公益");
      break;
    case "study":
      if (isOuterOxCircle(next)) {
        const result = applyWindFireWheelTile(next, tile);
        next = result.state;
        event = result.event;
        break;
      }
      event = { message: `到达「${tile.label}」`, cashFlow: next.cashFlow };
      next = appendLog(next, tile.label);
      break;
    case "financial_storm": {
      next = recalculateCashFlow({ ...next, cash: 0 });
      event = {
        message: "金融风暴：损失全部现金",
        cashFlow: next.cashFlow,
      };
      next = appendLog(next, "金融风暴 · 现金清零");
      break;
    }
    case "tax_audit": {
      const loss = Math.round(next.cash / 2);
      next = withCashFlow(next, {}, -loss);
      event = {
        message: `税务审计：失去现有现金的一半（-${loss.toLocaleString()}）`,
        cashFlow: next.cashFlow,
      };
      next = appendLog(next, "税务审计");
      break;
    }
    case "divorce": {
      const isMale = next.gender === "male";
      const loss = isMale ? next.cash : Math.round(next.cash / 2);
      const native = {
        housingMortgage: 0,
        educationLoan: 0,
        carLoan: 0,
        creditCard: 0,
        extra: 0,
        ...next.nativeLiabilities,
      };
      next = recalculateCashFlow({
        ...next,
        cash: Math.max(0, next.cash - loss),
        baseExpense: Math.max(0, (next.baseExpense ?? next.cashFlow.totalExpense) - 3000),
        nativeLiabilities: { ...native, extra: native.extra + 100_000 },
      });
      event = {
        message: isMale
          ? "离婚：男性玩家损失全部现金"
          : next.gender === "female"
            ? "离婚：女性玩家损失一半现金"
            : `离婚：损失现金 ${loss.toLocaleString()}`,
        cashFlow: next.cashFlow,
      };
      next = appendLog(next, "离婚");
      break;
    }
    case "wealth_leisure": {
      next = {
        ...next,
        timePoints: (next.timePoints ?? 0) + 50,
      };
      event = {
        message: "有钱有闲：时间积分 +50",
        cashFlow: next.cashFlow,
      };
      next = appendLog(next, event.message);
      break;
    }
    case "quality_life": {
      next = {
        ...next,
        qualityLifePoints: (next.qualityLifePoints ?? 0) + 10,
      };
      event = {
        message: "品生活：品质生活积分 +10",
        cashFlow: next.cashFlow,
      };
      next = appendLog(next, event.message);
      break;
    }
    default:
      event = { message: `到达「${tile.label}」`, cashFlow: next.cashFlow };
      next = appendLog(next, tile.label);
  }

  return finalizeEvent(next, event);
}

export { resolvePendingDecision } from "./decisions";

/** 结账日入账，供对局与规则测试复用 */
export function applyMonthlySettlement(state: PlayerRuntimeState): PlayerRuntimeState {
  return applySettlement(state).state;
}

export function createInitialPlayerState(identityId?: IdentityId): PlayerRuntimeState {
  if (identityId) {
    return createPlayerStateFromIdentity(identityId);
  }
  return structuredClone(DEFAULT_PLAYER_STATE);
}

export function loadPlayerState(
  roomId: string,
  userId: string
): PlayerRuntimeState {
  if (typeof window === "undefined") return createInitialPlayerState();
  const key = `life-leap-game:${roomId}:${userId}`;
  const raw = sessionStorage.getItem(key);
  const base = createInitialPlayerState();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as PlayerRuntimeState;
      const merged = recalculateCashFlow({
        ...createInitialPlayerState(parsed.identityId),
        ...parsed,
        pendingDecision: parsed.pendingDecision ?? null,
        holdings: parsed.holdings ?? [],
      });
      return merged;
    } catch {
      /* fall through */
    }
  }

  const identityId = getSelectedIdentity(roomId, userId);
  if (identityId) {
    return createInitialPlayerState(identityId);
  }

  return base;
}

export function savePlayerState(
  roomId: string,
  userId: string,
  state: PlayerRuntimeState
) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(
    `life-leap-game:${roomId}:${userId}`,
    JSON.stringify(state)
  );
}
