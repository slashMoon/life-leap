import type { CashFlowSnapshot } from "@/types/game";

export function calcMonthlyCashFlow(
  laborIncome: number,
  passiveIncome: number,
  totalExpense: number
): number {
  return laborIncome + passiveIncome - totalExpense;
}

export function calcNetWorth(
  totalAssets: number,
  totalLiabilities: number
): number {
  return totalAssets - totalLiabilities;
}

export function buildCashFlowSnapshot(params: {
  laborIncome: number;
  passiveIncome: number;
  totalExpense: number;
  totalAssets: number;
  totalLiabilities: number;
}): CashFlowSnapshot {
  const cashFlow = calcMonthlyCashFlow(
    params.laborIncome,
    params.passiveIncome,
    params.totalExpense
  );
  const netWorth = calcNetWorth(params.totalAssets, params.totalLiabilities);

  return {
    laborIncome: params.laborIncome,
    passiveIncome: params.passiveIncome,
    totalExpense: params.totalExpense,
    cashFlow,
    netWorth,
    totalAssets: params.totalAssets,
    totalLiabilities: params.totalLiabilities,
  };
}
