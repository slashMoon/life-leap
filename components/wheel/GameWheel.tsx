"use client";

import { WheelBoardSvg, type WheelToken } from "./WheelBoardSvg";

interface GameWheelProps {
  activePosition?: { track: "outer" | "inner"; index: number };
  lastDice?: number | null;
  playerLabel?: string;
  tokens?: WheelToken[];
}

export function GameWheel({
  activePosition,
  lastDice,
  playerLabel,
  tokens,
}: GameWheelProps) {
  return (
    <div className="ll-wheel-frame">
      <WheelBoardSvg
        activePosition={activePosition ?? { track: "outer", index: 0 }}
        lastDice={lastDice}
        playerLabel={playerLabel}
        tokens={tokens}
      />
    </div>
  );
}
