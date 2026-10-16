import {
  MAX_BOARD_PLAYERS,
  MIN_BOARD_PLAYERS,
  MOCK_MIN_BOARD_PLAYERS,
} from "@/types/identity";

export interface RoomStartSnapshot {
  bankerUserId?: string | null;
  players: { role?: string; identityId?: string }[];
}

export function getMinBoardPlayers(mockMode = true) {
  return mockMode ? MOCK_MIN_BOARD_PLAYERS : MIN_BOARD_PLAYERS;
}

export function getRoomStartBlockers(
  snapshot: RoomStartSnapshot,
  mockMode = true
): string[] {
  const blockers: string[] = [];
  const board = snapshot.players.filter((p) => p.role !== "banker");
  const min = getMinBoardPlayers(mockMode);

  if (!snapshot.bankerUserId) {
    blockers.push("尚未指定银行家");
  }
  if (board.length < min) {
    blockers.push(
      `玩家不足（当前 ${board.length} 人，至少 ${min} 人）`
    );
  }
  if (board.length > MAX_BOARD_PLAYERS) {
    blockers.push(`玩家过多（最多 ${MAX_BOARD_PLAYERS} 人）`);
  }
  const missingIdentity = board.filter((p) => !p.identityId);
  if (board.length > 0 && missingIdentity.length > 0) {
    blockers.push(`${missingIdentity.length} 名玩家尚未随机抽取身份`);
  }
  return blockers;
}

export function canStartRoom(snapshot: RoomStartSnapshot, mockMode = true) {
  return getRoomStartBlockers(snapshot, mockMode).length === 0;
}

/** 是否适合显示「单人试玩」（仅银行家一人在房） */
export function canSoloPractice(snapshot: RoomStartSnapshot) {
  const board = snapshot.players.filter((p) => p.role !== "banker");
  return board.length === 0 && !!snapshot.bankerUserId;
}
