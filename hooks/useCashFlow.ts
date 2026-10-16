"use client";

import { useMemo } from "react";
import { useGameStore } from "@/stores/game-store";

export function useCashFlow() {
  const cashFlow = useGameStore((s) => s.cashFlow);
  const player = useGameStore((s) => s.player);

  const formatted = useMemo(() => {
    const cf = cashFlow ?? player.cashFlow;
    if (!cf) return null;
    return {
      ...cf,
      cashFlowLabel:
        cf.cashFlow >= 0
          ? `+${cf.cashFlow.toLocaleString()}`
          : cf.cashFlow.toLocaleString(),
      netWorthLabel: `${(cf.netWorth / 10_000).toFixed(1)} 万`,
    };
  }, [cashFlow, player.cashFlow]);

  return { cashFlow: formatted, playerCash: player.cash };
}
