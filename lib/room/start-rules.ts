import type { GameMode } from "@/types/game";
import { MAX_BOARD_PLAYERS } from "@/types/identity";

export interface RoomStartPlayer {
  userId?: string;
  nickname?: string;
  role?: string;
  identityId?: string;
  bot?: boolean;
}

export interface RoomStartSnapshot {
  mode?: GameMode;
  fillBots?: boolean;
  maxPlayers?: number;
  hostUserId?: string | null;
  bankerUserId?: string | null;
  actorUserId?: string;
  actorNickname?: string;
  players: RoomStartPlayer[];
}

export function isRoomHost(
  snapshot: Pick<RoomStartSnapshot, "hostUserId" | "players">,
  userId?: string,
  nickname?: string
) {
  if (!snapshot.hostUserId) return false;
  if (userId && snapshot.hostUserId === userId) return true;
  if (nickname && snapshot.hostUserId === nickname) return true;
  const host = snapshot.players.find((player) => player.userId === snapshot.hostUserId);
  if (!host) return false;
  return (
    (!!nickname && host.nickname === nickname) ||
    (!!userId && (host.nickname === userId || host.userId === userId)) ||
    (!!nickname && host.userId === nickname)
  );
}

export function getRoomStartBlockers(snapshot: RoomStartSnapshot): string[] {
  const blockers: string[] = [];
  if ((snapshot.mode ?? "multi") === "solo") return blockers;

  if (
    (snapshot.actorUserId || snapshot.actorNickname) &&
    !isRoomHost(snapshot, snapshot.actorUserId, snapshot.actorNickname)
  ) {
    blockers.push("只有房主可以开始");
  }

  const board = snapshot.players.filter((player) => player.role !== "banker");
  const humans = board.filter((player) => !player.bot);
  const cap = Math.min(
    MAX_BOARD_PLAYERS,
    Math.max(2, snapshot.maxPlayers ?? MAX_BOARD_PLAYERS)
  );

  if (!snapshot.bankerUserId) blockers.push("尚未指定银行家");
  if (humans.length < 1) {
    blockers.push("至少需要 1 名真人玩家落座");
  } else if (board.length < 2 && humans.length < 2 && !snapshot.fillBots) {
    blockers.push("至少需要 2 名真人，或开启机器人补位");
  } else if (board.length < 2 && humans.length < 2 && snapshot.fillBots && cap < 2) {
    blockers.push("人数上限不足以开局");
  }
  if (board.length > MAX_BOARD_PLAYERS) {
    blockers.push(`玩家过多（最多 ${MAX_BOARD_PLAYERS} 人）`);
  }

  const missing = board.filter((player) => !player.bot && !player.identityId);
  if (missing.length > 0) {
    blockers.push(`${missing.length} 名玩家尚未随机抽取身份`);
  }
  return blockers;
}

export function canStartRoom(snapshot: RoomStartSnapshot) {
  return getRoomStartBlockers(snapshot).length === 0;
}

/** 旧入口：房间里只有银行家时，仍允许服务端把房主转成玩家并配机器人。 */
export function canSoloPractice(snapshot: RoomStartSnapshot) {
  const board = snapshot.players.filter((player) => player.role !== "banker");
  return board.length === 0 && !!snapshot.bankerUserId;
}
