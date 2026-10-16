import type { BoardTile } from "@/types/game";

/** 格子类型 → 原型配色 */
export const TILE_COLORS: Record<string, { fill: string; stroke: string; icon: string }> = {
  opportunity: { fill: "#1a3d2e", stroke: "#4ade80", icon: "🍀" },
  risk: { fill: "#3d3518", stroke: "#facc15", icon: "⚠️" },
  market: { fill: "#1a2a4a", stroke: "#60a5fa", icon: "💹" },
  settlement: { fill: "#3d1a1a", stroke: "#f87171", icon: "📕" },
  child: { fill: "#2d1a3d", stroke: "#c084fc", icon: "👶" },
  health: { fill: "#1a2d3d", stroke: "#38bdf8", icon: "🚀" },
  study: { fill: "#1a2d3d", stroke: "#38bdf8", icon: "🚀" },
  charity: { fill: "#2d1a3d", stroke: "#c084fc", icon: "❤️" },
  financial_storm: { fill: "#2d1a3d", stroke: "#c084fc", icon: "🌀" },
  investment: { fill: "#1a2a4a", stroke: "#60a5fa", icon: "🎯" },
  wealth_leisure: { fill: "#2d1a3d", stroke: "#c084fc", icon: "⏳" },
  quality_life: { fill: "#1a3d2e", stroke: "#4ade80", icon: "💎" },
  tax_audit: { fill: "#2d1a3d", stroke: "#c084fc", icon: "📋" },
  divorce: { fill: "#2d1a3d", stroke: "#c084fc", icon: "💔" },
};

export function getTileStyle(type: string) {
  return (
    TILE_COLORS[type] ?? {
      fill: "#1a1f2e",
      stroke: "#d4a853",
      icon: "●",
    }
  );
}

export function describeArcSegment(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  startAngle: number,
  endAngle: number
): string {
  const x1 = cx + rOuter * Math.cos(startAngle);
  const y1 = cy + rOuter * Math.sin(startAngle);
  const x2 = cx + rOuter * Math.cos(endAngle);
  const y2 = cy + rOuter * Math.sin(endAngle);
  const x3 = cx + rInner * Math.cos(endAngle);
  const y3 = cy + rInner * Math.sin(endAngle);
  const x4 = cx + rInner * Math.cos(startAngle);
  const y4 = cy + rInner * Math.sin(startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${x1} ${y1}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

/** 从底部（6 点方向）顺时针排列格子 */
export function segmentAngles(index: number, total: number) {
  const slice = (2 * Math.PI) / total;
  const start = Math.PI / 2 + index * slice;
  const end = start + slice;
  const mid = start + slice / 2;
  return { start, end, mid };
}

export function labelPosition(
  cx: number,
  cy: number,
  radius: number,
  angle: number
) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

export function tileKey(tile: BoardTile) {
  return `${tile.track}-${tile.index}`;
}

/** 棋子落在格子弧段中心 */
export function markerPosition(
  cx: number,
  cy: number,
  track: "outer" | "inner",
  index: number,
  total: number,
  rInner: number,
  rOuter: number
) {
  const { mid } = segmentAngles(index, total);
  const rMid = (rInner + rOuter) / 2;
  return labelPosition(cx, cy, rMid, mid);
}
