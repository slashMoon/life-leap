"use client";

import { WheelBoardSvg, type WheelToken } from "./WheelBoardSvg";

interface GameWheelProps {
  activePosition?: { track: "outer" | "inner"; index: number };
  lastDice?: number | null;
  playerLabel?: string;
  tokens?: WheelToken[];
  /** 自己当前圈层，用来给新轨道留一圈呼吸光 */
  orbit?: "牛马" | "老板" | "核心";
}

export function GameWheel({
  activePosition,
  lastDice,
  playerLabel,
  tokens,
  orbit,
}: GameWheelProps) {
  const orbitClass = orbit === "核心" ? "is-core-track" : orbit === "老板" ? "is-boss-track" : "";
  return (
    <div className={`ll-wheel-frame${orbitClass ? ` ${orbitClass}` : ""}`}>
      <WheelBoardSvg
        activePosition={activePosition ?? { track: "outer", index: 0 }}
        lastDice={lastDice}
        playerLabel={playerLabel}
        tokens={tokens}
      />
    </div>
  );
}
