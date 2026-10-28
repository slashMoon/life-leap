"use client";

import { useEffect, useRef, useState } from "react";
import type { BoardTile, LifeCircle } from "@/types/game";
import { INNER_TRACK, OUTER_TRACK } from "@/lib/constants/board";
import type { WheelHandle, WheelSceneState } from "./pixi-scene";
import type { WheelToken } from "./types";
import { WheelCaption } from "./WheelCaption";
import { describeArcSegment, labelPosition, segmentAngles } from "./wheel-utils";

interface RingPoint {
  track: "outer" | "inner";
  index: number;
}

interface PixiWheelProps {
  activePosition?: RingPoint;
  /** 最近一次停留的格子，和当前回合所在格分开点亮 */
  holdPosition?: RingPoint;
  lastDice?: number | null;
  playerLabel?: string;
  tokens?: WheelToken[];
  orbit?: LifeCircle;
  ritualKey?: string | null;
  onFail?: (error: unknown) => void;
}

function tileAt(position?: RingPoint) {
  if (!position) return null;
  const tiles = position.track === "outer" ? OUTER_TRACK : INNER_TRACK;
  return tiles.find((tile) => tile.index === position.index) ?? null;
}

function HotSector({ position, tone }: { position?: RingPoint; tone: "strong" | "soft" }) {
  if (!position) return null;
  const total = position.track === "outer" ? 24 : 16;
  const { start, end, mid } = segmentAngles(position.index, total);
  const inner = position.track === "outer" ? 234 : 134;
  const outer = position.track === "outer" ? 328 : 208;
  const tip = labelPosition(400, 400, outer + 8, mid);
  return (
    <g>
      <path
        d={describeArcSegment(400, 400, inner, outer, start, end)}
        fill={tone === "strong" ? "rgba(255, 214, 120, 0.78)" : "rgba(243, 226, 179, 0.28)"}
        stroke={tone === "strong" ? "#fff6d8" : "#f3e2b3"}
        strokeWidth={tone === "strong" ? 6 : 3}
      />
      <circle cx={tip.x} cy={tip.y} r={tone === "strong" ? 8 : 5} fill="#fff6d8" />
    </g>
  );
}

export function PixiWheel({
  activePosition,
  holdPosition,
  lastDice,
  playerLabel,
  tokens,
  orbit,
  ritualKey,
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
    ritualKey,
    onHover: (tile) => setHovered(tile),
  });
  stateRef.current = {
    tokens: tokens ?? [],
    activePosition,
    lastDice,
    playerLabel,
    orbit,
    ritualKey,
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

  const same =
    activePosition &&
    holdPosition &&
    activePosition.track === holdPosition.track &&
    activePosition.index === holdPosition.index;

  return (
    <div className={`ll-pixi-wheel${ready ? " is-ready" : ""}`}>
      <div ref={hostRef} className="ll-pixi-host" />
      <svg
        className="ll-wheel-hot"
        viewBox="0 0 800 800"
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 5,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          transform: "translateZ(0)",
        }}
      >
        <HotSector position={holdPosition ?? activePosition} tone="strong" />
        {same ? null : <HotSector position={activePosition} tone="soft" />}
      </svg>
      <WheelCaption
        hovered={hovered}
        activeTile={tileAt(activePosition)}
        activePosition={activePosition}
        lastDice={lastDice}
      />
    </div>
  );
}
