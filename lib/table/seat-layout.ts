/** 棋牌桌座位：自己在正下方，其余按回合顺序顺时针环绕（下一家在你的左手边）。 */

export interface TableAnchor {
  slot: number;
  /** 相对牌桌宽高的百分比 */
  left: number;
  top: number;
}

export interface PlaqueSize {
  w: number;
  h: number;
}

export function orderAroundSelf<T extends { userId: string; order: number }>(
  seats: readonly T[],
  selfUserId: string
): T[] {
  const sorted = seats
    .slice()
    .sort((a, b) => a.order - b.order || a.userId.localeCompare(b.userId));
  const index = sorted.findIndex((seat) => seat.userId === selfUserId);
  if (index <= 0) return sorted;
  return [...sorted.slice(index), ...sorted.slice(0, index)];
}

/**
 * 把座位摆在牌桌内侧的圆上。半径取「扣除名牌半宽后」的较短边，避免名牌被裁出桌面。
 */
export function tableAnchors(
  count: number,
  width: number,
  height: number,
  plaque: PlaqueSize
): TableAnchor[] {
  const n = Math.max(1, Math.floor(count) || 1);
  const w = Math.max(plaque.w + 24, width);
  const h = Math.max(plaque.h + 24, height);
  const padX = Math.min(w / 2 - 12, plaque.w / 2 + 8);
  const padY = Math.min(h / 2 - 12, plaque.h / 2 + 8);
  const radius = Math.max(24, Math.min(w / 2 - padX, h / 2 - padY));

  return Array.from({ length: n }, (_, slot) => {
    const angle = Math.PI / 2 + (slot / n) * Math.PI * 2;
    const x = w / 2 + radius * Math.cos(angle);
    const y = h / 2 + radius * Math.sin(angle);
    return {
      slot,
      left: (x / w) * 100,
      top: (y / h) * 100,
    };
  });
}

/** 座位条上的金额。万元以上用「万」，避免名牌被长数字撑破。 */
export function formatTableCash(value: number) {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 10000) {
    const wan = abs / 10000;
    const digits = wan >= 100 || Number.isInteger(Number(wan.toFixed(1))) ? 0 : 1;
    return `${sign}${wan.toFixed(digits)}万`;
  }
  return `${sign}${Math.round(abs).toLocaleString("zh-CN")}`;
}
