"use client";

import { useCallback, useEffect, useState } from "react";
import { isMockMode } from "@/lib/mock/config";
import type { LifeCircle } from "@/types/game";
import type { CeremonyView } from "./CircleCeremony";

export interface BannerView {
  nickname: string;
  to: LifeCircle;
  userId?: string;
}

const SAMPLE = {
  passiveIncome: 12000,
  totalExpense: 8000,
  netWorth: 2_400_000,
  netWorthWan: 200,
  multiplier: 2,
};

/** Mock 下用 ?ceremony=boss|core|other 与 ?frame=ring|leap|title 定格演出。 */
export function useCeremonyPreview(nickname: string) {
  const [full, setFull] = useState<CeremonyView | null>(null);
  const [banner, setBanner] = useState<BannerView | null>(null);
  const [dev, setDev] = useState(false);

  const play = useCallback(
    (to: "老板" | "核心", frame?: string) => {
      setBanner(null);
      setFull({
        ...SAMPLE,
        nickname: nickname || "星尘",
        to,
        frame,
      });
    },
    [nickname]
  );

  const playOther = useCallback(() => {
    setFull(null);
    setBanner({ nickname: "旅人", to: "老板" });
  }, []);
  const clearFull = useCallback(() => setFull(null), []);
  const clearBanner = useCallback(() => setBanner(null), []);

  useEffect(() => {
    if (!isMockMode()) return;
    const params = new URLSearchParams(window.location.search);
    const kind = params.get("ceremony");
    const frame = params.get("frame") ?? undefined;
    if (!kind) {
      setDev(true);
      return;
    }
    if (kind === "boss" || kind === "老板") play("老板", frame);
    else if (kind === "core" || kind === "核心") play("核心", frame);
    else if (kind === "other" || kind === "banner") playOther();
  }, [play, playOther]);

  return {
    full,
    banner,
    dev,
    playBoss: () => play("老板"),
    playCore: () => play("核心"),
    playOther,
    clearFull,
    clearBanner,
  };
}
