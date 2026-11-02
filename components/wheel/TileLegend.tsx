import { INNER_TRACK, OUTER_TRACK } from "@/lib/constants/board";
import { getTileStyle } from "./wheel-utils";

/** 当前轨道上会出现的格子，文案用棋盘原名。 */
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
    <section className="ll-panel ll-legend" aria-label={title}>
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item.type}>
            <i style={{ background: getTileStyle(item.type).stroke }} aria-hidden />
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
