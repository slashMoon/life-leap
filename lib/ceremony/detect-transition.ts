import type { LifeCircle } from "@/types/game";

const ORDER: LifeCircle[] = ["牛马", "老板", "核心"];

export interface CircleSeatSnap {
  userId: string;
  round: number;
  circle: LifeCircle;
}

export interface CircleCue {
  userId: string;
  round: number;
  from: LifeCircle;
  to: LifeCircle;
  key: string;
}

/** 同一玩家、同一回合只记一次，重连后的重复快照不会再次命中。 */
export function circleCueKey(userId: string, round: number) {
  return `${userId}:${round}`;
}

export function detectCircleCues(
  previous: Record<string, LifeCircle> | null,
  seats: CircleSeatSnap[],
  seen: ReadonlySet<string>
): { cues: CircleCue[]; next: Record<string, LifeCircle> } {
  const next: Record<string, LifeCircle> = {};
  for (const seat of seats) next[seat.userId] = seat.circle;
  if (!previous) return { cues: [], next };

  const cues: CircleCue[] = [];
  for (const seat of seats) {
    const before = previous[seat.userId];
    if (!before || before === seat.circle) continue;
    if (ORDER.indexOf(seat.circle) <= ORDER.indexOf(before)) continue;
    const key = circleCueKey(seat.userId, seat.round);
    if (seen.has(key)) continue;
    cues.push({
      userId: seat.userId,
      round: seat.round,
      from: before,
      to: seat.circle,
      key,
    });
  }
  return { cues, next };
}
