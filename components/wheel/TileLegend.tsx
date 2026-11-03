"use client";

import { Popover } from "antd";
import { INNER_TRACK, OUTER_TRACK } from "@/lib/constants/board";
import { getTileStyle } from "./wheel-utils";

/** 当前轨道格子，收成「格例」弹出，文案仍用棋盘原名。 */
export function TileLegend({ track }: { track: "outer" | "inner" }) {
  const tiles = track === "inner" ? INNER_TRACK : OUTER_TRACK;
  const items: { type: string; label: string }[] = [];
  const seen = new Set<string>();
  for (const tile of tiles) {
    if (seen.has(tile.type)) continue;
    seen.add(tile.type);
    items.push({ type: tile.type, label: tile.label });
  }
  const title = track === "outer" ? "外圈格子" : "内圈格子";

  return (
    <Popover
      trigger="click"
      placement="topLeft"
      title={title}
      content={
        <ul className="ll-legend-pop">
          {items.map((item) => (
            <li key={item.type}>
              <i style={{ background: getTileStyle(item.type).stroke }} aria-hidden />
              {item.label}
            </li>
          ))}
        </ul>
      }
    >
      <button type="button" className="ll-legend-btn">
        格例
      </button>
    </Popover>
  );
}
