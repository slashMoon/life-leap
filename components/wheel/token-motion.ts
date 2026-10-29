import { INNER_TRACK_SIZE, OUTER_TRACK_SIZE } from "@/lib/constants/board";
import { labelPosition, segmentAngles } from "./wheel-utils";

export type TrackName = "outer" | "inner";

export interface RingPoint {
  track: TrackName;
  index: number;
}

export interface MotionStep {
  fromTrack: TrackName;
  toTrack: TrackName;
  fromIndex: number;
  toIndex: number;
  /** 换轨（圈层跃迁进内圈）时沿半径滑入，而不是在原轨道上绕行 */
  radial: boolean;
}

export const WHEEL_SIZE = 800;
export const WHEEL_CENTER = WHEEL_SIZE / 2;

const RING = {
  outer: { inner: 232, outer: 330 },
  inner: { inner: 132, outer: 210 },
} as const;

export function trackLength(track: TrackName) {
  return track === "outer" ? OUTER_TRACK_SIZE : INNER_TRACK_SIZE;
}

export function ringMid(track: TrackName) {
  const ring = RING[track];
  return (ring.inner + ring.outer) / 2;
}

/** 顺时针走到目标格，不含起点，含终点。同一格表示绕整圈。 */
export function forwardIndexes(from: number, to: number, total: number) {
  const path: number[] = [];
  let cursor = ((from % total) + total) % total;
  const target = ((to % total) + total) % total;
  for (let step = 0; step < total; step += 1) {
    cursor = (cursor + 1) % total;
    path.push(cursor);
    if (cursor === target) break;
  }
  return path;
}

export function clockwiseDelta(from: number, to: number) {
  const tau = Math.PI * 2;
  return ((to - from) % tau + tau) % tau;
}

export function motionSteps(from: RingPoint, to: RingPoint): MotionStep[] {
  if (from.track !== to.track) {
    return [
      {
        fromTrack: from.track,
        toTrack: to.track,
        fromIndex: from.index,
        toIndex: to.index,
        radial: true,
      },
    ];
  }
  if (from.index === to.index) return [];
  const hops = forwardIndexes(from.index, to.index, trackLength(to.track));
  let previous = from.index;
  return hops.map((index) => {
    const step: MotionStep = {
      fromTrack: to.track,
      toTrack: to.track,
      fromIndex: previous,
      toIndex: index,
      radial: false,
    };
    previous = index;
    return step;
  });
}

export function motionDuration(steps: MotionStep[]) {
  if (steps.length === 0) return 0;
  if (steps.some((step) => step.radial)) return 980;
  return Math.min(1680, Math.max(320, steps.length * 150));
}

export interface MotionSample extends MotionStep {
  eased: number;
  track: TrackName;
  index: number;
}

export function sampleMotion(steps: MotionStep[], progress: number): MotionSample | null {
  if (steps.length === 0) return null;
  const clamped = Math.min(1, Math.max(0, progress));
  const scaled = clamped * steps.length;
  let hop = Math.floor(scaled);
  let local = scaled - hop;
  if (hop >= steps.length) {
    hop = steps.length - 1;
    local = 1;
  }
  const step = steps[hop];
  const eased = local * local * (3 - 2 * local);
  const crossed = eased > 0.55;
  return {
    ...step,
    eased,
    track: step.radial ? (crossed ? step.toTrack : step.fromTrack) : step.toTrack,
    index: crossed ? step.toIndex : step.fromIndex,
  };
}

export function poseFromSample(sample: MotionSample) {
  const a0 = segmentAngles(sample.fromIndex, trackLength(sample.fromTrack)).mid;
  const a1 = segmentAngles(sample.toIndex, trackLength(sample.toTrack)).mid;
  const angle = a0 + clockwiseDelta(a0, a1) * sample.eased;
  const r0 = ringMid(sample.fromTrack);
  const r1 = ringMid(sample.toTrack);
  const radius = r0 + (r1 - r0) * (sample.radial ? sample.eased : 0);
  return {
    ...labelPosition(WHEEL_CENTER, WHEEL_CENTER, radius, angle),
    angle,
    radius,
  };
}

export function restPose(track: TrackName, index: number) {
  const angle = segmentAngles(index, trackLength(track)).mid;
  const radius = ringMid(track);
  return {
    ...labelPosition(WHEEL_CENTER, WHEEL_CENTER, radius, angle),
    angle,
    radius,
  };
}
