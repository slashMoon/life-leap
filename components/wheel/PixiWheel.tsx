"use client";

import { useEffect, useRef, useState } from "react";
import type { BoardTile, LifeCircle } from "@/types/game";
import { INNER_TRACK, OUTER_TRACK } from "@/lib/constants/board";
import type { WheelHandle, WheelSceneState } from "./pixi-scene";
import type { WheelToken } from "./types";
import { WheelCaption } from "./WheelCaption";

interface RingPoint {
  track: "outer" | "inner";
  index: number;
}

interface PixiWheelProps {
  activePosition?: RingPoint;
  lastDice?: number | null;
  playerLabel?: string;
  tokens?: WheelToken[];
  orbit?: LifeCircle;
  onFail?: (error: unknown) => void;
}

function tileAt(position?: RingPoint) {
  if (!position) return null;
  const tiles = position.track === "outer" ? OUTER_TRACK : INNER_TRACK;
  return tiles.find((tile) => tile.index === position.index) ?? null;
}

export function PixiWheel({
  activePosition,
  lastDice,
  playerLabel,
  tokens,
  orbit,
  onFail,
}: PixiWheelProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<WheelHandle | null>(null);
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;
  const [ready, setReady] = useState(false);
  const [hovered, setHovered] = useState<BoardTile | null>(null);
  const stateRef = useRef<WheelSceneState>({
    tokens: tokens ?? [],
    activePosition,
    lastDice,
    playerLabel,
    orbit,
    onHover: (tile) => setHovered(tile),
  });
  stateRef.current = {
    tokens: tokens ?? [],
    activePosition,
    lastDice,
    playerLabel,
    orbit,
    onHover: (tile) => setHovered(tile),
  };

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;

    void import("./pixi-scene")
      .then((mod) => {
        if (cancelled) return null;
        return mod.mountDualRing(host, stateRef.current);
      })
      .then((mounted) => {
        if (!mounted) return;
        if (cancelled) {
          mounted.destroy();
          return;
        }
        handleRef.current = mounted;
        mounted.sync(stateRef.current);
        setReady(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) onFailRef.current?.(error);
      });

    return () => {
      cancelled = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, []);

  useEffect(() => {
    handleRef.current?.sync(stateRef.current);
  });

  return (
    <div className={`ll-pixi-wheel${ready ? " is-ready" : ""}`}>
      <div ref={hostRef} className="ll-pixi-host" />
      <WheelCaption
        hovered={hovered}
        activeTile={tileAt(activePosition)}
        activePosition={activePosition}
        lastDice={lastDice}
      />
    </div>
  );
}
