import type { BoardTile } from "@/types/game";

export function WheelCaption({
  hovered,
  activeTile,
  activePosition,
  lastDice,
}: {
  hovered: BoardTile | null;
  activeTile: BoardTile | null;
  activePosition?: { track: "outer" | "inner"; index: number };
  lastDice?: number | null;
}) {
  return (
    <div className="ll-wheel-caption" aria-live="polite">
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
  );
}
