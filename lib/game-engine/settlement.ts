import { buildCashFlowSnapshot } from "@/lib/rule-engine";
import type { CashFlowSnapshot } from "@/types/game";

export interface SettlementInput {
  laborIncome: number;
  passiveIncome: number;
  totalExpense: number;
  totalAssets: number;
  totalLiabilities: number;
  loanInterest?: number;
}

/** 结账日：自动结算现金流与贷款利息 */
export function runSettlement(input: SettlementInput): CashFlowSnapshot {
  const expenseWithInterest =
    input.totalExpense + (input.loanInterest ?? 0);

  return buildCashFlowSnapshot({
    laborIncome: input.laborIncome,
    passiveIncome: input.passiveIncome,
    totalExpense: expenseWithInterest,
    totalAssets: input.totalAssets,
    totalLiabilities: input.totalLiabilities,
  });
}
