"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { detectCircleCues, type CircleCue } from "@/lib/ceremony/detect-transition";
import type { GameSnapshot } from "@/lib/game-session/types";
import type { LifeCircle } from "@/types/game";

export interface CeremonyCue extends CircleCue {
  nickname: string;
  passiveIncome: number;
  totalExpense: number;
  netWorth: number;
  netWorthWan: number;
  multiplier: number;
}

export function useCircleCeremony(snapshot: GameSnapshot | null, userId: string) {
  const previous = useRef<Record<string, LifeCircle> | null>(null);
  const seen = useRef(new Set<string>());
  const [full, setFull] = useState<CeremonyCue | null>(null);
  const [light, setLight] = useState<CeremonyCue | null>(null);

  useEffect(() => {
    if (!snapshot) return;
    const seats = snapshot.seats
      .filter((seat) => seat.role !== "banker")
      .map((seat) => ({
        userId: seat.userId,
        round: seat.state.round,
        circle: seat.state.circle,
      }));
    const detected = detectCircleCues(previous.current, seats, seen.current);
    previous.current = detected.next;
    for (const cue of detected.cues) seen.current.add(cue.key);
    if (detected.cues.length === 0) return;

    const detailed = detected.cues.map((cue) => {
      const seat = snapshot.seats.find((item) => item.userId === cue.userId);
      return {
        ...cue,
        nickname: seat?.nickname || cue.userId,
        passiveIncome: seat?.state.cashFlow.passiveIncome ?? 0,
        totalExpense: seat?.state.cashFlow.totalExpense ?? 0,
        netWorth: seat?.state.cashFlow.netWorth ?? 0,
        netWorthWan: seat?.state.coreNetWorthThreshold ?? 200,
        multiplier: seat?.state.corePassiveIncomeMultiplier ?? 2,
      };
    });
    const mine = detailed.find((cue) => cue.userId === userId && (cue.to === "老板" || cue.to === "核心"));
    const other = detailed.find((cue) => cue.userId !== userId);
    if (mine) setFull(mine);
    else if (other) setLight(other);
  }, [snapshot, userId]);

  const dismissFull = useCallback(() => setFull(null), []);
  const dismissLight = useCallback(() => setLight(null), []);

  return {
    full,
    light,
    dismissFull,
    dismissLight,
  };
}
