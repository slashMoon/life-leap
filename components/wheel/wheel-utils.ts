import type { BoardTile } from "@/types/game";

/** 格子类型对应实物沙盘的图标色。盘面底色统一为黑，颜色只用于图标。 */
export const TILE_COLORS: Record<string, { fill: string; stroke: string; icon: string }> = {
  opportunity: { fill: "#07080c", stroke: "#3ddc84", icon: "🍀" },
  risk: { fill: "#07080c", stroke: "#f5c542", icon: "⚠️" },
  market: { fill: "#07080c", stroke: "#5b9dff", icon: "💱" },
  settlement: { fill: "#07080c", stroke: "#e85d4c", icon: "📕" },
  child: { fill: "#07080c", stroke: "#c084fc", icon: "👶" },
  health: { fill: "#07080c", stroke: "#ff7a45", icon: "🚀" },
  study: { fill: "#07080c", stroke: "#ff7a45", icon: "🚀" },
  charity: { fill: "#07080c", stroke: "#f3e2b3", icon: "🎗️" },
  financial_storm: { fill: "#07080c", stroke: "#ff6b6b", icon: "⛈️" },
  investment: { fill: "#07080c", stroke: "#5b9dff", icon: "🌀" },
  wealth_leisure: { fill: "#07080c", stroke: "#c084fc", icon: "⏳" },
  quality_life: { fill: "#07080c", stroke: "#3ddc84", icon: "💎" },
  tax_audit: { fill: "#07080c", stroke: "#7eb6ff", icon: "📋" },
  divorce: { fill: "#07080c", stroke: "#c084fc", icon: "💔" },
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
  const n = (value: number) => Math.round(value * 100) / 100;
  const x1 = n(cx + rOuter * Math.cos(startAngle));
  const y1 = n(cy + rOuter * Math.sin(startAngle));
  const x2 = n(cx + rOuter * Math.cos(endAngle));
  const y2 = n(cy + rOuter * Math.sin(endAngle));
  const x3 = n(cx + rInner * Math.cos(endAngle));
  const y3 = n(cy + rInner * Math.sin(endAngle));
  const x4 = n(cx + rInner * Math.cos(startAngle));
  const y4 = n(cy + rInner * Math.sin(startAngle));
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
  const n = (value: number) => Math.round(value * 100) / 100;
  return {
    x: n(cx + radius * Math.cos(angle)),
    y: n(cy + radius * Math.sin(angle)),
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
