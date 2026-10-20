import {
  DEFAULT_CORE_NET_WORTH_WAN,
  DEFAULT_CORE_PASSIVE_MULTIPLIER,
} from "@/lib/constants/circle-rules";
import { buildCashFlowSnapshot } from "@/lib/rule-engine/cash-flow";
import type { NativeLiabilities } from "@/types/identity";
import type { PlayerHolding, PlayerRuntimeState } from "@/types/player";

export function sumNativeLiabilities(liabilities?: NativeLiabilities): number {
  if (!liabilities) return 0;
  return (
    liabilities.housingMortgage +
    liabilities.educationLoan +
    liabilities.carLoan +
    liabilities.creditCard +
    liabilities.extra
  );
}

function holdingExpense(holdings: PlayerHolding[]) {
  return holdings.reduce((sum, holding) => sum + holding.expense, 0);
}

function holdingPassive(holdings: PlayerHolding[]) {
  return holdings.reduce((sum, holding) => sum + holding.passiveIncome, 0);
}

function holdingValue(holdings: PlayerHolding[]) {
  return holdings.reduce((sum, holding) => sum + holding.value, 0);
}

function holdingLoan(holdings: PlayerHolding[]) {
  return holdings.reduce((sum, holding) => sum + holding.loan, 0);
}

/** 补齐旧存档缺的账本字段，避免总资产退回成现金 */
export function ensureLedger(state: PlayerRuntimeState): PlayerRuntimeState {
  const holdings = state.holdings ?? [];
  const laborIncome = state.laborIncome ?? state.cashFlow.laborIncome;
  const baseExpense =
    state.baseExpense ??
    Math.max(0, state.cashFlow.totalExpense - holdingExpense(holdings));

  return {
    ...state,
    holdings,
    laborIncome,
    baseExpense,
    bankLoan: state.bankLoan ?? 0,
    creditCardDebt: state.creditCardDebt ?? 0,
    coreNetWorthThreshold:
      state.coreNetWorthThreshold ?? DEFAULT_CORE_NET_WORTH_WAN,
    corePassiveIncomeMultiplier:
      state.corePassiveIncomeMultiplier ?? DEFAULT_CORE_PASSIVE_MULTIPLIER,
  };
}

/** 由现金、持仓、原生负债和贷款重算现金流快照 */
export function recalculateCashFlow(
  state: PlayerRuntimeState
): PlayerRuntimeState {
  const next = ensureLedger(state);
  const holdings = next.holdings;
  const totalLiabilities =
    sumNativeLiabilities(next.nativeLiabilities) +
    (next.bankLoan ?? 0) +
    (next.creditCardDebt ?? 0) +
    holdingLoan(holdings);
  const totalAssets = next.cash + holdingValue(holdings);

  return {
    ...next,
    cashFlow: buildCashFlowSnapshot({
      laborIncome: next.laborIncome,
      passiveIncome: holdingPassive(holdings),
      totalExpense: next.baseExpense + holdingExpense(holdings),
      totalAssets,
      totalLiabilities,
    }),
  };
}

export interface CashFlowPatch {
  laborIncome?: number;
  passiveIncome?: number;
  totalExpense?: number;
  totalLiabilities?: number;
}

/**
 * 调整现金、月薪或不属于持仓的月支出。
 * 被动收入和负债以持仓 / 贷款账本为准，这里的对应补丁不再直接改快照。
 */
export function withCashFlow(
  state: PlayerRuntimeState,
  patch: CashFlowPatch,
  cashDelta = 0
): PlayerRuntimeState {
  const current = ensureLedger(state);
  let next: PlayerRuntimeState = current;

  if (patch.laborIncome !== undefined) {
    next = { ...next, laborIncome: patch.laborIncome };
  }
  if (patch.totalExpense !== undefined) {
    const delta = patch.totalExpense - current.cashFlow.totalExpense;
    next = { ...next, baseExpense: next.baseExpense + delta };
  }

  const cash = Math.max(0, next.cash + cashDelta);
  return recalculateCashFlow({ ...next, cash });
}

function payBucket(balance: number, remaining: number) {
  const paid = Math.min(Math.max(0, balance), remaining);
  return { balance: balance - paid, paid };
}

export interface RepayResult {
  state: PlayerRuntimeState;
  paid: number;
}

/** 用现金偿还负债：信用卡透支、银行贷款、原生负债，再偿还持仓贷款 */
export function repayDebt(
  state: PlayerRuntimeState,
  amount: number
): RepayResult {
  const current = recalculateCashFlow(state);
  const requested = Math.max(0, amount);
  const debt = current.cashFlow.totalLiabilities;
  let remaining = Math.min(requested, current.cash, debt);
  const paid = remaining;
  if (remaining <= 0) return { state: current, paid: 0 };

  let creditCardDebt = current.creditCardDebt ?? 0;
  let bankLoan = current.bankLoan ?? 0;
  const native: NativeLiabilities = {
    housingMortgage: 0,
    educationLoan: 0,
    carLoan: 0,
    creditCard: 0,
    extra: 0,
    ...current.nativeLiabilities,
  };

  const take = (balance: number) => {
    const result = payBucket(balance, remaining);
    remaining -= result.paid;
    return result.balance;
  };

  creditCardDebt = take(creditCardDebt);
  bankLoan = take(bankLoan);
  native.creditCard = take(native.creditCard);
  native.carLoan = take(native.carLoan);
  native.educationLoan = take(native.educationLoan);
  native.extra = take(native.extra);
  native.housingMortgage = take(native.housingMortgage);

  const holdings = [...current.holdings]
    .map((holding, index) => ({ holding, index }))
    .sort((a, b) => a.holding.loan - b.holding.loan || a.index - b.index);

  const nextHoldings = current.holdings.map((holding) => ({ ...holding }));
  for (const item of holdings) {
    if (remaining <= 0) break;
    const result = payBucket(item.holding.loan, remaining);
    remaining -= result.paid;
    nextHoldings[item.index] = { ...item.holding, loan: result.balance };
  }

  return {
    paid,
    state: recalculateCashFlow({
      ...current,
      cash: current.cash - paid,
      creditCardDebt,
      bankLoan,
      nativeLiabilities: native,
      holdings: nextHoldings,
    }),
  };
}

export function sellHolding(
  state: PlayerRuntimeState,
  holdingId: string,
  price: number
): { state: PlayerRuntimeState; sold: boolean; message: string } {
  const current = ensureLedger(state);
  const holding = current.holdings.find((item) => item.id === holdingId);
  if (!holding) {
    return { state: current, sold: false, message: "持仓不存在，无法出售" };
  }

  const shortfall = Math.max(0, holding.loan - price);
  if (shortfall > current.cash) {
    return {
      state: current,
      sold: false,
      message: `出价 ${price.toLocaleString()} 不足以清偿「${holding.name}」贷款 ${holding.loan.toLocaleString()}，现金还差 ${shortfall.toLocaleString()}`,
    };
  }

  const net = price - holding.loan;
  const next = recalculateCashFlow({
    ...current,
    cash: current.cash + net,
    holdings: current.holdings.filter((item) => item.id !== holdingId),
  });

  return {
    state: next,
    sold: true,
    message: `出售「${holding.name}」成交 ${price.toLocaleString()}，清偿贷款 ${holding.loan.toLocaleString()}，净入账 ${net.toLocaleString()}`,
  };
}
