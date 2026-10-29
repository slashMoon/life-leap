"use client";

import { useState } from "react";
import type { LifeCircle } from "@/types/game";
import { PixiWheel } from "./PixiWheel";
import type { WheelToken } from "./types";
import { WheelBoardSvg } from "./WheelBoardSvg";

interface GameWheelProps {
  activePosition?: { track: "outer" | "inner"; index: number };
  lastDice?: number | null;
  playerLabel?: string;
  tokens?: WheelToken[];
  /** 自己当前圈层，用来给新轨道留一圈呼吸光 */
  orbit?: LifeCircle;
}

export function GameWheel({
  activePosition,
  lastDice,
  playerLabel,
  tokens,
  orbit,
}: GameWheelProps) {
  const [engine, setEngine] = useState<"pixi" | "svg">("pixi");
  const orbitClass = orbit === "核心" ? "is-core-track" : orbit === "老板" ? "is-boss-track" : "";
  return (
    <div className={`ll-wheel-frame${orbitClass ? ` ${orbitClass}` : ""}`} data-engine={engine}>
      {engine === "pixi" ? (
        <PixiWheel
          activePosition={activePosition}
          lastDice={lastDice}
          playerLabel={playerLabel}
          tokens={tokens}
          orbit={orbit}
          onFail={() => setEngine("svg")}
        />
      ) : (
        <WheelBoardSvg
          activePosition={activePosition ?? { track: "outer", index: 0 }}
          lastDice={lastDice}
          playerLabel={playerLabel}
          tokens={tokens}
        />
      )}
    </div>
  );
}
