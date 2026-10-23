"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { INNER_TRACK, OUTER_TRACK } from "@/lib/constants/board";

type TrackName = "outer" | "inner";

interface TravelToken {
  id: string;
  track: TrackName;
  index: number;
}

interface Point {
  x: number;
  y: number;
  index: number;
}

export interface TravelFrame {
  points: Record<string, { x: number; y: number }>;
  highlight: { track: TrackName; index: number } | null;
  landed: { track: TrackName; index: number; nonce: number } | null;
}

function forwardIndexes(from: number, to: number, total: number) {
  const path: number[] = [];
  let cursor = from;
  for (let step = 0; step < total; step += 1) {
    cursor = (cursor + 1) % total;
    path.push(cursor);
    if (cursor === to) break;
  }
  return path;
}

function sample(points: Point[], progress: number) {
  if (points.length <= 1) return points[0];
  const scaled = Math.min(points.length - 1, Math.max(0, progress * (points.length - 1)));
  const index = Math.min(points.length - 2, Math.floor(scaled));
  const local = scaled - index;
  const eased = local * local * (3 - 2 * local);
  const from = points[index];
  const to = points[index + 1] ?? from;
  return {
    x: from.x + (to.x - from.x) * eased,
    y: from.y + (to.y - from.y) * eased,
    index: local > 0.55 ? to.index : from.index,
  };
}

/** 棋子沿顺时针格子步进。首次出现和减少动效时直接落位。 */
export function useTokenTravel(
  tokens: TravelToken[] | undefined,
  locate: (track: TrackName, index: number) => { x: number; y: number }
): TravelFrame {
  const locateRef = useRef(locate);
  locateRef.current = locate;
  const tokensRef = useRef(tokens);
  tokensRef.current = tokens;
  const settled = useRef<Record<string, TravelToken & { x: number; y: number }>>({});
  const [frame, setFrame] = useState<TravelFrame>({
    points: {},
    highlight: null,
    landed: null,
  });
  const signature = (tokens ?? []).map((token) => `${token.id}:${token.track}:${token.index}`).join("|");

  useLayoutEffect(() => {
    const list = tokensRef.current ?? [];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const points: Record<string, { x: number; y: number }> = {};
    const motions: Array<{ id: string; track: TrackName; points: Point[]; dur: number }> = [];

    for (const token of list) {
      const target = locateRef.current(token.track, token.index);
      const previous = settled.current[token.id];
      if (!previous || reduce || previous.track !== token.track || previous.index === token.index) {
        points[token.id] = target;
        settled.current[token.id] = { ...token, ...target };
        continue;
      }
      const total = token.track === "outer" ? OUTER_TRACK.length : INNER_TRACK.length;
      const hops = forwardIndexes(previous.index, token.index, total);
      const poly: Point[] = [
        { ...locateRef.current(previous.track, previous.index), index: previous.index },
        ...hops.map((index) => ({ ...locateRef.current(token.track, index), index })),
      ];
      motions.push({
        id: token.id,
        track: token.track,
        points: poly,
        dur: Math.min(1400, Math.max(320, (poly.length - 1) * 140)),
      });
      points[token.id] = { x: poly[0].x, y: poly[0].y };
    }

    if (motions.length === 0) {
      setFrame((current) => ({ ...current, points, highlight: null }));
      return;
    }

    const origin = motions[0].points[0];
    setFrame((current) => ({
      ...current,
      points,
      highlight: { track: motions[0].track, index: origin.index },
    }));

    let raf = 0;
    let flashTimer = 0;
    const started = performance.now();
    const tick = (now: number) => {
      let finished = true;
      const next = { ...points };
      let highlight: TravelFrame["highlight"] = null;
      for (const motion of motions) {
        const progress = Math.min(1, Math.max(0, (now - started) / motion.dur));
        if (progress < 1) finished = false;
        const pose = sample(motion.points, progress);
        next[motion.id] = { x: pose.x, y: pose.y };
        highlight = { track: motion.track, index: pose.index };
        if (progress === 1) {
          const last = motion.points[motion.points.length - 1];
          settled.current[motion.id] = {
            id: motion.id,
            track: motion.track,
            index: last.index,
            x: last.x,
            y: last.y,
          };
        }
      }
      setFrame((current) => ({
        points: next,
        highlight,
        landed: finished && highlight
          ? { ...highlight, nonce: Math.round(now) }
          : current.landed,
      }));
      if (!finished) raf = requestAnimationFrame(tick);
      else {
        flashTimer = window.setTimeout(() => {
          setFrame((current) => ({ ...current, highlight: null, landed: null }));
        }, 560);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(flashTimer);
    };
  }, [signature]);

  return frame;
}
