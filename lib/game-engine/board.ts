import {
  INNER_TRACK,
  INNER_TRACK_SIZE,
  OUTER_TRACK,
  OUTER_TRACK_SIZE,
} from "@/lib/constants/board";
import { movePosition } from "./dice";
import type { BoardTile } from "@/types/game";

export function getTile(
  track: "outer" | "inner",
  index: number
): BoardTile | undefined {
  const tiles = track === "outer" ? OUTER_TRACK : INNER_TRACK;
  return tiles.find((t) => t.index === index);
}

export function advanceOnTrack(
  track: "outer" | "inner",
  currentIndex: number,
  steps: number
): { index: number; tile: BoardTile | undefined } {
  const size = track === "outer" ? OUTER_TRACK_SIZE : INNER_TRACK_SIZE;
  const index = movePosition(currentIndex, steps, size);
  return { index, tile: getTile(track, index) };
}

/** 从当前格的下一格走到落点，含落点。起点本身不算经过。 */
export function tilesAlongMove(
  track: "outer" | "inner",
  fromIndex: number,
  steps: number
): BoardTile[] {
  if (steps <= 0) return [];
  const size = track === "outer" ? OUTER_TRACK_SIZE : INNER_TRACK_SIZE;
  const tiles: BoardTile[] = [];
  for (let step = 1; step <= steps; step += 1) {
    const tile = getTile(track, (fromIndex + step) % size);
    if (tile) tiles.push(tile);
  }
  return tiles;
}
