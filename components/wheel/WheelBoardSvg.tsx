"use client";

import { useMemo, useState } from "react";
import {
  INNER_TRACK,
  LIFE_DIMENSIONS,
  OUTER_TRACK,
} from "@/lib/constants/board";
import type { BoardTile } from "@/types/game";
import {
  describeArcSegment,
  getTileStyle,
  labelPosition,
  markerPosition,
  segmentAngles,
  tileKey,
} from "./wheel-utils";

const SIZE = 800;
const CX = SIZE / 2;
const CY = SIZE / 2;

const R = {
  outerOuter: 390,
  outerInner: 300,
  innerOuter: 290,
  innerInner: 200,
  hub: 185,
  labelOuter: 345,
  labelInner: 245,
  iconOuter: 365,
  iconInner: 265,
};

interface WheelBoardSvgProps {
  activePosition?: { track: "outer" | "inner"; index: number };
  lastDice?: number | null;
  playerLabel?: string;
  onTileClick?: (tile: BoardTile) => void;
  className?: string;
}

function PlayerMarker({
  x,
  y,
  label,
  dice,
}: {
  x: number;
  y: number;
  label: string;
  dice?: number | null;
}) {
  const initial = label?.charAt(0) || "我";
  return (
    <g className="player-marker" transform={`translate(${x}, ${y})`}>
      {/* 脉冲光环 */}
      <circle r={28} fill="none" stroke="#f0d78c" strokeWidth={2} opacity={0.6}>
        <animate
          attributeName="r"
          values="22;32;22"
          dur="1.8s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.7;0.2;0.7"
          dur="1.8s"
          repeatCount="indefinite"
        />
      </circle>
      <circle r={22} fill="#d4a853" opacity={0.25} />
      <circle r={18} fill="#1a1408" stroke="#f0d78c" strokeWidth={3} />
      <circle r={14} fill="#d4a853" />
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#1a1408"
        fontSize={14}
        fontWeight={700}
      >
        {initial}
      </text>
      {dice != null && (
        <g transform="translate(14, -18)">
          <rect
            x={-14}
            y={-12}
            width={28}
            height={22}
            rx={6}
            fill="#f0d78c"
            stroke="#1a1408"
            strokeWidth={1.5}
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            y={1}
            fill="#1a1408"
            fontSize={13}
            fontWeight={800}
          >
            {dice}
          </text>
        </g>
      )}
      {/* 底部指针 */}
      <polygon
        points="0,20 -6,32 6,32"
        fill="#f0d78c"
        stroke="#1a1408"
        strokeWidth={1}
      />
    </g>
  );
}

function TrackRing({
  tiles,
  rInner,
  rOuter,
  labelR,
  iconR,
  activeIndex,
  track,
  onTileClick,
  onHover,
}: {
  tiles: BoardTile[];
  rInner: number;
  rOuter: number;
  labelR: number;
  iconR: number;
  activeIndex?: number;
  track: "outer" | "inner";
  onTileClick?: (tile: BoardTile) => void;
  onHover: (tile: BoardTile | null) => void;
}) {
  return (
    <g>
      {tiles.map((tile) => {
        const { start, end, mid } = segmentAngles(tile.index, tiles.length);
        const style = getTileStyle(tile.type);
        const isActive = activeIndex === tile.index;
        const label = labelPosition(CX, CY, labelR, mid);
        const icon = labelPosition(CX, CY, iconR, mid);
        const rotate = (mid * 180) / Math.PI + 90;

        return (
          <g
            key={tileKey(tile)}
            className="cursor-pointer"
            onMouseEnter={() => onHover(tile)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onTileClick?.(tile)}
          >
            <path
              d={describeArcSegment(CX, CY, rInner, rOuter, start, end)}
              fill={isActive ? "#3d4a28" : style.fill}
              stroke={isActive ? "#f0d78c" : style.stroke}
              strokeWidth={isActive ? 3.5 : 1}
              opacity={isActive ? 1 : activeIndex !== undefined ? 0.55 : 0.92}
            />
            {isActive && (
              <path
                d={describeArcSegment(CX, CY, rInner - 2, rOuter + 2, start, end)}
                fill="none"
                stroke="#f0d78c"
                strokeWidth={2}
                opacity={0.5}
                strokeDasharray="6 4"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="20"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </path>
            )}
            <text
              x={icon.x}
              y={icon.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={track === "outer" ? 14 : 13}
              opacity={isActive ? 1 : activeIndex !== undefined ? 0.6 : 1}
            >
              {style.icon}
            </text>
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill={isActive ? "#f0d78c" : "#f5f0e6"}
              fontSize={track === "outer" ? 9.5 : 10}
              fontWeight={isActive ? 700 : 500}
              transform={`rotate(${rotate}, ${label.x}, ${label.y})`}
              opacity={isActive ? 1 : activeIndex !== undefined ? 0.65 : 1}
            >
              {tile.label}
            </text>
            {isActive && (
              <text
                x={label.x}
                y={label.y + (track === "outer" ? 14 : 12)}
                textAnchor="middle"
                fill="#f0d78c"
                fontSize={7}
                fontWeight={700}
                transform={`rotate(${rotate}, ${label.x}, ${label.y + (track === "outer" ? 14 : 12)})`}
              >
                ▼ 当前位置
              </text>
            )}
            {tile.isStart && !isActive && (
              <g transform={`translate(${label.x}, ${label.y + 18})`}>
                <text
                  textAnchor="middle"
                  fill="#d4a853"
                  fontSize={8}
                  fontWeight={700}
                  transform={`rotate(${rotate}, 0, 0)`}
                >
                  START ▶
                </text>
              </g>
            )}
          </g>
        );
      })}
    </g>
  );
}

export function WheelBoardSvg({
  activePosition,
  lastDice,
  playerLabel = "我",
  onTileClick,
  className = "",
}: WheelBoardSvgProps) {
  const [hovered, setHovered] = useState<BoardTile | null>(null);

  const activeOuter =
    activePosition?.track === "outer" ? activePosition.index : undefined;
  const activeInner =
    activePosition?.track === "inner" ? activePosition.index : undefined;

  const activeTile = useMemo(() => {
    if (!activePosition) return null;
    const tiles =
      activePosition.track === "outer" ? OUTER_TRACK : INNER_TRACK;
    return tiles.find((t) => t.index === activePosition.index) ?? null;
  }, [activePosition]);

  const marker = useMemo(() => {
    if (!activePosition) return null;
    const isOuter = activePosition.track === "outer";
    const total = isOuter ? OUTER_TRACK.length : INNER_TRACK.length;
    return markerPosition(
      CX,
      CY,
      activePosition.track,
      activePosition.index,
      total,
      isOuter ? R.outerInner : R.innerInner,
      isOuter ? R.outerOuter : R.innerOuter
    );
  }, [activePosition]);

  const defs = useMemo(
    () => (
      <defs>
        <radialGradient id="wheelBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#141b2d" />
          <stop offset="100%" stopColor="#0a0e1a" />
        </radialGradient>
        <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2a2218" />
          <stop offset="100%" stopColor="#0a0e1a" />
        </radialGradient>
        <filter id="goldGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="markerShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
        </filter>
      </defs>
    ),
    []
  );

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto w-full max-w-[min(92vw,720px)] drop-shadow-2xl"
        role="img"
        aria-label="人生跃迁游戏轮盘"
      >
        {defs}

        <circle cx={CX} cy={CY} r={R.outerOuter + 8} fill="url(#wheelBg)" />
        <circle
          cx={CX}
          cy={CY}
          r={R.outerOuter + 8}
          fill="none"
          stroke="#d4a853"
          strokeWidth={2}
          opacity={0.35}
        />

        <TrackRing
          tiles={OUTER_TRACK}
          rInner={R.outerInner}
          rOuter={R.outerOuter}
          labelR={R.labelOuter}
          iconR={R.iconOuter}
          activeIndex={activeOuter}
          track="outer"
          onTileClick={onTileClick}
          onHover={setHovered}
        />

        <circle
          cx={CX}
          cy={CY}
          r={R.innerOuter + 4}
          fill="none"
          stroke="#d4a853"
          strokeWidth={1.5}
          opacity={0.5}
        />

        <TrackRing
          tiles={INNER_TRACK}
          rInner={R.innerInner}
          rOuter={R.innerOuter}
          labelR={R.labelInner}
          iconR={R.iconInner}
          activeIndex={activeInner}
          track="inner"
          onTileClick={onTileClick}
          onHover={setHovered}
        />

        <circle cx={CX} cy={CY} r={R.hub} fill="url(#hubGlow)" stroke="#d4a853" strokeWidth={2} />
        {LIFE_DIMENSIONS.map((dim, i) => {
          const angle = segmentAngles(i, LIFE_DIMENSIONS.length).mid;
          const pos = labelPosition(CX, CY, 120, angle);
          const rotate = (angle * 180) / Math.PI + 90;
          return (
            <text
              key={dim}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#d4a853"
              fontSize={11}
              fontWeight={600}
              transform={`rotate(${rotate}, ${pos.x}, ${pos.y})`}
            >
              {dim}
            </text>
          );
        })}

        <text
          x={CX}
          y={CY}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#f0d78c"
          fontSize={42}
          fontWeight={300}
          filter="url(#goldGlow)"
        >
          ∞
        </text>

        {/* 玩家棋子 — 渲染在最上层 */}
        {marker && activeTile && (
          <g filter="url(#markerShadow)">
            <PlayerMarker
              x={marker.x}
              y={marker.y}
              label={playerLabel}
              dice={lastDice}
            />
          </g>
        )}
      </svg>

      <div className="pointer-events-none absolute bottom-2 left-1/2 w-[92%] max-w-md -translate-x-1/2 rounded-lg border border-gold/30 bg-[#141b2dcc] px-4 py-2 text-center backdrop-blur-sm">
        {hovered ? (
          <>
            <p className="text-sm text-gold">
              {hovered.track === "outer" ? "外圈·牛马圈" : "内圈·老板/核心圈"} · 第{" "}
              {hovered.index + 1} 格
            </p>
            <p className="text-base font-medium">{hovered.label}</p>
          </>
        ) : activeTile && activePosition ? (
          <>
            <p className="text-sm text-gold">
              当前位置 · {activePosition.track === "outer" ? "外圈" : "内圈"} 第{" "}
              {activePosition.index + 1} 格
              {lastDice != null && (
                <span className="ml-2 rounded bg-gold/20 px-2 py-0.5">
                  骰子 {lastDice} 点
                </span>
              )}
            </p>
            <p className="text-base font-medium text-[#f0d78c]">
              {activeTile.label}
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-400">掷骰子后棋子会移动到对应格子</p>
        )}
      </div>
    </div>
  );
}
