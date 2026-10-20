"use client";

import { useMemo, useState } from "react";
import {
  INNER_TRACK,
  LIFE_DIMENSIONS,
  OUTER_TRACK,
} from "@/lib/constants/board";
import type { BoardTile } from "@/types/game";
import { TileGlyph } from "./tile-glyphs";
import { useTokenTravel } from "./use-token-travel";
import {
  describeArcSegment,
  labelPosition,
  markerPosition,
  segmentAngles,
  tileKey,
} from "./wheel-utils";

const SIZE = 800;
const CX = SIZE / 2;
const CY = SIZE / 2;

const R = {
  bezelOuter: 352,
  bezelInner: 336,
  outerOuter: 330,
  outerInner: 232,
  seamOuter: 228,
  seamInner: 214,
  innerOuter: 210,
  innerInner: 132,
  dimOuter: 126,
  dimInner: 90,
};

function createStars(count: number) {
  let seed = 20261020;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    x: Math.round(next() * SIZE * 10) / 10,
    y: Math.round(next() * SIZE * 10) / 10,
    r: next() > 0.86 ? 1.35 : 0.7,
    gold: next() > 0.8,
    opacity: Math.round((0.35 + next() * 0.6) * 100) / 100,
  }));
}

const STARS = createStars(96);

export interface WheelToken {
  id: string;
  label: string;
  track: "outer" | "inner";
  index: number;
  color?: string;
  active?: boolean;
  dice?: number | null;
}

interface WheelBoardSvgProps {
  activePosition?: { track: "outer" | "inner"; index: number };
  lastDice?: number | null;
  playerLabel?: string;
  tokens?: WheelToken[];
  onTileClick?: (tile: BoardTile) => void;
  className?: string;
}

function offsetMarker(
  x: number,
  y: number,
  cx: number,
  cy: number,
  slot: number,
  count: number
) {
  if (count <= 1) return { x, y };
  const dx = x - cx;
  const dy = y - cy;
  const len = Math.hypot(dx, dy) || 1;
  const shift = (slot - (count - 1) / 2) * 26;
  return {
    x: x + (-dy / len) * shift,
    y: y + (dx / len) * shift,
  };
}

function PlayerMarker({
  x,
  y,
  label,
  dice,
  color = "var(--ll-gold)",
  active = true,
}: {
  x: number;
  y: number;
  label: string;
  dice?: number | null;
  color?: string;
  active?: boolean;
}) {
  const initial = label?.charAt(0) || "我";
  return (
    <g className="player-marker" transform={`translate(${x}, ${y})`}>
      {active && <circle className="ll-token-ring" r={22} fill="none" stroke={color} strokeWidth={1.6} />}
      <circle r={16} fill="#0c0a08" stroke={color} strokeWidth={3} />
      <circle r={11} fill={color} />
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#1a1408"
        fontSize={13}
        fontWeight={700}
      >
        {initial}
      </text>
      {dice != null && (
        <g transform="translate(14, -16)">
          <rect x={-13} y={-11} width={26} height={20} rx={6} fill="var(--ll-gold-bright)" />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            y={1}
            fill="#1a1408"
            fontSize={12}
            fontWeight={800}
          >
            {dice}
          </text>
        </g>
      )}
    </g>
  );
}

function RadialLabel({
  text,
  mid,
  inner,
  outer,
  active,
  size,
}: {
  text: string;
  mid: number;
  inner: number;
  outer: number;
  active: boolean;
  size: number;
}) {
  const chars = Array.from(text);
  const rotate = (mid * 180) / Math.PI - 90;
  return (
    <g>
      {chars.map((char, index) => {
        const t = chars.length === 1 ? 0.5 : index / (chars.length - 1);
        const pos = labelPosition(CX, CY, inner + (outer - inner) * t, mid);
        return (
          <text
            key={`${char}-${index}`}
            x={pos.x}
            y={pos.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={active ? "var(--ll-gold-bright)" : "var(--ll-ink)"}
            fontSize={size}
            fontWeight={active ? 700 : 500}
            transform={`rotate(${rotate}, ${pos.x}, ${pos.y})`}
          >
            {char}
          </text>
        );
      })}
    </g>
  );
}

function StartArrow({
  radius,
  from,
  to,
  labelRadius,
}: {
  radius: number;
  from: number;
  to: number;
  labelRadius: number;
}) {
  const start = labelPosition(CX, CY, radius, from);
  const end = labelPosition(CX, CY, radius, to);
  const mid = (from + to) / 2;
  const label = labelPosition(CX, CY, labelRadius, mid);
  const head = labelPosition(CX, CY, radius, to);
  const tangent = to + Math.PI / 2;
  const hx = Math.cos(tangent);
  const hy = Math.sin(tangent);
  const px = -hy;
  const py = hx;
  return (
    <g fill="none" stroke="var(--ll-gold-bright)" strokeWidth={1.6}>
      <path
        d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`}
      />
      <path
        d={`M ${head.x + hx * 7} ${head.y + hy * 7} L ${head.x - hx * 2 + px * 4} ${head.y - hy * 2 + py * 4} L ${head.x - hx * 2 - px * 4} ${head.y - hy * 2 - py * 4} Z`}
        fill="var(--ll-gold-bright)"
        stroke="none"
      />
      <text
        x={label.x}
        y={label.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--ll-gold-bright)"
        fontSize={9}
        fontWeight={700}
        stroke="#1a1408"
        strokeWidth={0.6}
        paintOrder="stroke"
      >
        START
      </text>
    </g>
  );
}

function TrackRing({
  tiles,
  rInner,
  rOuter,
  activeIndex,
  flashIndex,
  flashNonce,
  track,
  onTileClick,
  onHover,
}: {
  tiles: BoardTile[];
  rInner: number;
  rOuter: number;
  activeIndex?: number;
  flashIndex?: number;
  flashNonce?: number;
  track: "outer" | "inner";
  onTileClick?: (tile: BoardTile) => void;
  onHover: (tile: BoardTile | null) => void;
}) {
  const labelInner = rInner + (track === "outer" ? 16 : 14);
  const labelOuter = rOuter - (track === "outer" ? 30 : 26);
  const iconPad = track === "outer" ? 16 : 14;

  return (
    <g>
      {tiles.map((tile) => {
        const { start, end, mid } = segmentAngles(tile.index, tiles.length);
        const isActive = activeIndex === tile.index;
        const icon = labelPosition(CX, CY, rOuter - iconPad, mid);
        const iconRotate = (mid * 180) / Math.PI + 90;

        return (
          <g
            key={tileKey(tile)}
            className="cursor-pointer"
            onMouseEnter={() => onHover(tile)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onTileClick?.(tile)}
          >
            <path
              className={isActive ? "ll-tile is-active" : "ll-tile"}
              d={describeArcSegment(CX, CY, rInner, rOuter, start, end)}
            />
            {isActive && (
              <path
                className="ll-tile-hot"
                d={describeArcSegment(CX, CY, rInner + 2, rOuter - 2, start, end)}
                fill="rgba(243, 226, 179, 0.16)"
                stroke="var(--ll-gold-bright)"
                strokeWidth={1.35}
              />
            )}
            {flashIndex === tile.index && (
              <path
                key={flashNonce}
                className="ll-land-flash"
                d={describeArcSegment(CX, CY, rInner, rOuter, start, end)}
                fill="rgba(243, 226, 179, 0.55)"
                stroke="none"
              />
            )}
            <g transform={`translate(${icon.x}, ${icon.y}) rotate(${iconRotate})`}>
              <TileGlyph type={tile.type} />
            </g>
            <RadialLabel
              text={tile.label}
              mid={mid}
              inner={labelInner}
              outer={labelOuter}
              active={isActive}
              size={track === "outer" ? 12 : 11}
            />
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
  tokens,
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
    const tiles = activePosition.track === "outer" ? OUTER_TRACK : INNER_TRACK;
    return tiles.find((tile) => tile.index === activePosition.index) ?? null;
  }, [activePosition]);

  const marker = useMemo(() => {
    if (!activePosition || (tokens && tokens.length > 0)) return null;
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
  }, [activePosition, tokens]);

  const travel = useTokenTravel(tokens, (track, index) => {
    const isOuter = track === "outer";
    const total = isOuter ? OUTER_TRACK.length : INNER_TRACK.length;
    return markerPosition(
      CX,
      CY,
      track,
      index,
      total,
      isOuter ? R.outerInner : R.innerInner,
      isOuter ? R.outerOuter : R.innerOuter
    );
  });

  const tokenMarkers = useMemo(() => {
    if (!tokens?.length) return [];
    const counts = new Map<string, number>();
    for (const token of tokens) {
      const key = `${token.track}:${token.index}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const used = new Map<string, number>();
    return tokens.map((token) => {
      const key = `${token.track}:${token.index}`;
      const slot = used.get(key) ?? 0;
      used.set(key, slot + 1);
      const isOuter = token.track === "outer";
      const total = isOuter ? OUTER_TRACK.length : INNER_TRACK.length;
      const base = markerPosition(
        CX,
        CY,
        token.track,
        token.index,
        total,
        isOuter ? R.outerInner : R.innerInner,
        isOuter ? R.outerOuter : R.innerOuter
      );
      const pos = offsetMarker(base.x, base.y, CX, CY, slot, counts.get(key) ?? 1);
      return { token, ...pos };
    });
  }, [tokens]);

  const outerStart = segmentAngles(0, OUTER_TRACK.length);
  const innerStart = segmentAngles(0, INNER_TRACK.length);

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="mx-auto aspect-square w-full max-w-[min(92vw,760px)]"
        role="img"
        aria-label="人生跃迁游戏轮盘"
      >
        <defs>
          <radialGradient id="llHub" cx="50%" cy="42%" r="60%">
            <stop offset="0%" stopColor="#3a2c16" />
            <stop offset="55%" stopColor="#120e0a" />
            <stop offset="100%" stopColor="#05060a" />
          </radialGradient>
          <linearGradient id="llMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff8e4" />
            <stop offset="18%" stopColor="#f3e2b3" />
            <stop offset="42%" stopColor="#8d6a2e" />
            <stop offset="58%" stopColor="#fff1c4" />
            <stop offset="78%" stopColor="#c4923a" />
            <stop offset="100%" stopColor="#6e5018" />
          </linearGradient>
          <linearGradient id="llDust" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f3e2b3" stopOpacity="0" />
            <stop offset="40%" stopColor="#f3e2b3" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#d4a853" stopOpacity="0" />
          </linearGradient>
          <filter id="llGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="llMarker" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.6" floodColor="#000" floodOpacity="0.65" />
          </filter>
        </defs>

        <rect width={SIZE} height={SIZE} fill="#05060a" />
        {STARS.map((star) => (
          <circle
            key={star.id}
            cx={star.x}
            cy={star.y}
            r={star.r}
            fill={star.gold ? "var(--ll-gold-bright)" : "#fff"}
            opacity={star.opacity}
          />
        ))}
        <path
          d="M 80 560 C 220 420, 420 300, 700 180"
          fill="none"
          stroke="url(#llDust)"
          strokeWidth="22"
          opacity="0.7"
        />

        <circle className="ll-bezel-glow" cx={CX} cy={CY} r={R.bezelOuter + 10} fill="none" stroke="rgba(212,168,83,0.28)" strokeWidth={10} />
        <circle
          className="ll-bezel"
          cx={CX}
          cy={CY}
          r={R.bezelOuter}
          fill="none"
          stroke="url(#llMetal)"
          strokeWidth={13}
          filter="url(#llGlow)"
        />
        <circle
          cx={CX}
          cy={CY}
          r={(R.bezelOuter + R.bezelInner) / 2}
          fill="none"
          stroke="#fff6d8"
          strokeWidth={1}
          opacity={0.35}
        />

        <TrackRing
          tiles={OUTER_TRACK}
          rInner={R.outerInner}
          rOuter={R.outerOuter}
          activeIndex={travel.highlight?.track === "outer" ? travel.highlight.index : activeOuter}
          flashIndex={travel.landed?.track === "outer" ? travel.landed.index : undefined}
          flashNonce={travel.landed?.nonce}
          track="outer"
          onTileClick={onTileClick}
          onHover={setHovered}
        />

        <circle
          cx={CX}
          cy={CY}
          r={(R.seamOuter + R.seamInner) / 2}
          fill="none"
          stroke="url(#llMetal)"
          strokeWidth={R.seamOuter - R.seamInner}
          filter="url(#llGlow)"
        />

        <TrackRing
          tiles={INNER_TRACK}
          rInner={R.innerInner}
          rOuter={R.innerOuter}
          activeIndex={travel.highlight?.track === "inner" ? travel.highlight.index : activeInner}
          flashIndex={travel.landed?.track === "inner" ? travel.landed.index : undefined}
          flashNonce={travel.landed?.nonce}
          track="inner"
          onTileClick={onTileClick}
          onHover={setHovered}
        />

        <StartArrow
          radius={R.bezelOuter + 16}
          labelRadius={R.bezelOuter + 30}
          from={outerStart.start + 0.05}
          to={outerStart.end - 0.02}
        />
        <StartArrow
          radius={(R.seamOuter + R.seamInner) / 2}
          labelRadius={(R.seamOuter + R.seamInner) / 2}
          from={innerStart.start + 0.12}
          to={innerStart.end - 0.08}
        />

        <circle cx={CX} cy={CY} r={R.dimOuter} fill="none" stroke="url(#llMetal)" strokeWidth={2.2} />
        <circle cx={CX} cy={CY} r={R.dimInner} fill="url(#llHub)" stroke="url(#llMetal)" strokeWidth={1.4} />
        {LIFE_DIMENSIONS.map((dimension, index) => {
          const angle = segmentAngles(index, LIFE_DIMENSIONS.length).mid;
          const pos = labelPosition(CX, CY, (R.dimOuter + R.dimInner) / 2, angle);
          let rotate = (angle * 180) / Math.PI + 90;
          const normalized = ((rotate % 360) + 360) % 360;
          if (normalized > 90 && normalized < 270) rotate += 180;
          return (
            <text
              key={dimension}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--ll-gold-bright)"
              fontSize={11}
              fontWeight={600}
              transform={`rotate(${rotate}, ${pos.x}, ${pos.y})`}
            >
              {dimension}
            </text>
          );
        })}

        <text
          x={CX + 2}
          y={CY + 8}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#6b501c"
          fontSize={78}
          fontFamily="Palatino, 'Times New Roman', serif"
          opacity={0.85}
        >
          ∞
        </text>
        <text
          x={CX}
          y={CY + 4}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="url(#llMetal)"
          fontSize={78}
          fontFamily="Palatino, 'Times New Roman', serif"
          filter="url(#llGlow)"
        >
          ∞
        </text>

        {tokenMarkers.length > 0 ? (
          <g filter="url(#llMarker)">
            {tokenMarkers.map(({ token, x, y }) => {
              const moving = travel.points[token.id];
              const onTheWay = Boolean(travel.highlight);
              return (
                <PlayerMarker
                  key={token.id}
                  x={onTheWay && moving ? moving.x : x}
                  y={onTheWay && moving ? moving.y : y}
                  label={token.label}
                  dice={onTheWay ? null : token.dice}
                  color={token.color}
                  active={token.active !== false}
                />
              );
            })}
          </g>
        ) : (
          marker &&
          activeTile && (
            <g filter="url(#llMarker)">
              <PlayerMarker x={marker.x} y={marker.y} label={playerLabel} dice={lastDice} />
            </g>
          )
        )}
      </svg>

      <div className="ll-wheel-caption">
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
                <span className="ml-2 rounded bg-gold/20 px-2 py-0.5">骰子 {lastDice} 点</span>
              )}
            </p>
            <p className="text-base font-medium text-gold-light">{activeTile.label}</p>
          </>
        ) : (
          <p className="text-xs text-[var(--ll-muted)]">掷骰子后棋子会移动到对应格子</p>
        )}
      </div>
    </div>
  );
}
