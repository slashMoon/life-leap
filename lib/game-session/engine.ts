import { resolvePendingDecision } from "@/lib/game-engine/decisions";
import { repayDebt, recalculateCashFlow } from "@/lib/game-engine/ledger";
import { executeTurn } from "@/lib/game-engine/play-turn";
import { createInitialPlayerState } from "@/lib/game-engine/tile-effects";
import { getIdentity } from "@/lib/constants/identities";
import type { IdentityId, RoomPlayerRole } from "@/types/identity";
import type {
  GameSession,
  GameSnapshot,
  JoinSeatInput,
  SessionCommandResult,
} from "./types";

const CHAT_LIMIT = 50;

export function createEmptySession(roomId: string): GameSession {
  return {
    roomId,
    seats: [],
    currentUserId: null,
    lastActorUserId: null,
    started: false,
    chat: [],
    revision: 0,
  };
}

export function turnOrderOf(session: GameSession): string[] {
  return session.seats
    .filter((seat) => seat.role !== "banker")
    .slice()
    .sort((a, b) => a.order - b.order || a.userId.localeCompare(b.userId))
    .map((seat) => seat.userId);
}

export function toSnapshot(session: GameSession): GameSnapshot {
  return {
    roomId: session.roomId,
    phase: "playing",
    currentUserId: session.currentUserId,
    turnOrder: turnOrderOf(session),
    lastActorUserId: session.lastActorUserId,
    turnDeadlineAt: session.turnDeadlineAt ?? null,
    seats: session.seats.map((seat) => ({
      userId: seat.userId,
      nickname: seat.nickname,
      role: seat.role,
      order: seat.order,
      connected: seat.connected,
      bot: seat.bot,
      state: seat.state,
    })),
    chat: session.chat,
    revision: session.revision,
  };
}

function fail(
  session: GameSession,
  code: string,
  message: string
): SessionCommandResult {
  return { ok: false, code, message, snapshot: toSnapshot(session) };
}

function ok(session: GameSession): SessionCommandResult {
  return { ok: true, snapshot: toSnapshot(session) };
}

function parseIdentity(id?: string): IdentityId | undefined {
  if (!id) return undefined;
  try {
    getIdentity(id as IdentityId);
    return id as IdentityId;
  } catch {
    return undefined;
  }
}

function syncCurrent(session: GameSession) {
  const order = turnOrderOf(session);
  if (order.length === 0) {
    session.currentUserId = null;
    return;
  }
  if (!session.started) {
    session.currentUserId = order[0];
    return;
  }
  if (!session.currentUserId || !order.includes(session.currentUserId)) {
    session.currentUserId = order[0];
  }
}

function nextPlayer(session: GameSession, fromUserId: string): string | null {
  const order = turnOrderOf(session);
  if (order.length === 0) return null;
  const index = order.indexOf(fromUserId);
  if (index < 0) return order[0];
  return order[(index + 1) % order.length];
}

function requireCurrentPlayer(
  session: GameSession,
  userId: string
): SessionCommandResult | null {
  const seat = session.seats.find((item) => item.userId === userId);
  if (!seat || seat.role === "banker") {
    return fail(session, "NOT_A_PLAYER", "只有棋盘上的玩家可以操作");
  }
  if (session.currentUserId !== userId) {
    return fail(session, "NOT_YOUR_TURN", "还没轮到你");
  }
  return null;
}

export function joinSeat(
  session: GameSession,
  input: JoinSeatInput
): SessionCommandResult {
  const existing = session.seats.find((seat) => seat.userId === input.userId);
  if (existing) {
    if (input.nickname) existing.nickname = input.nickname;
    existing.connected = true;
    syncCurrent(session);
    return { ...ok(session), createdSeat: false };
  }

  const role: RoomPlayerRole = input.role === "banker" ? "banker" : "player";
  const identityId = parseIdentity(input.identityId);
  let state = createInitialPlayerState(identityId);
  if (
    input.coreNetWorthThreshold != null ||
    input.corePassiveIncomeMultiplier != null
  ) {
    state = recalculateCashFlow({
      ...state,
      coreNetWorthThreshold:
        input.coreNetWorthThreshold ?? state.coreNetWorthThreshold,
      corePassiveIncomeMultiplier:
        input.corePassiveIncomeMultiplier ?? state.corePassiveIncomeMultiplier,
    });
  }

  const order =
    input.order ??
    session.seats.reduce((max, seat) => Math.max(max, seat.order), -1) + 1;

  session.seats.push({
    userId: input.userId,
    nickname: input.nickname?.trim() || input.userId,
    role,
    order,
    connected: true,
    state,
  });
  syncCurrent(session);
  session.revision += 1;
  return { ...ok(session), createdSeat: true };
}

export function markDisconnected(session: GameSession, userId: string) {
  const seat = session.seats.find((item) => item.userId === userId);
  if (!seat) return;
  seat.connected = false;
}

/** 服务端掷一次（风火轮仍由 executeTurn 在同一次行动里加总）。 */
export function rollForSeat(
  session: GameSession,
  userId: string
): SessionCommandResult {
  const denied = requireCurrentPlayer(session, userId);
  if (denied) return denied;
  const seat = session.seats.find((item) => item.userId === userId)!;
  if (seat.state.pendingDecision) {
    return fail(session, "PENDING_DECISION", "请先完成当前决策");
  }

  const beforeCircle = seat.state.circle;
  const next = executeTurn(seat.state);
  seat.state = next;
  session.lastActorUserId = userId;
  session.started = true;
  if (!next.pendingDecision) {
    session.currentUserId = nextPlayer(session, userId);
  }
  session.revision += 1;

  return {
    ...ok(session),
    dice: {
      playerId: userId,
      value: next.lastDice ?? 0,
      timestamp: Date.now(),
    },
    tile: next.lastTile
      ? {
          userId,
          track: next.track,
          index: next.boardIndex,
          tileType: next.lastTile.type,
          tileLabel: next.lastTile.label,
        }
      : undefined,
    circle:
      next.circle !== beforeCircle
        ? { userId, from: beforeCircle, to: next.circle }
        : undefined,
  };
}

export function decideForSeat(
  session: GameSession,
  userId: string,
  accept: boolean
): SessionCommandResult {
  const denied = requireCurrentPlayer(session, userId);
  if (denied) return denied;
  const seat = session.seats.find((item) => item.userId === userId)!;
  if (!seat.state.pendingDecision) {
    return fail(session, "NO_PENDING", "当前没有待处理的决策");
  }

  const beforeCircle = seat.state.circle;
  const next = resolvePendingDecision(seat.state, accept);
  seat.state = next;
  session.lastActorUserId = userId;
  session.started = true;
  if (!next.pendingDecision) {
    session.currentUserId = nextPlayer(session, userId);
  }
  session.revision += 1;

  return {
    ...ok(session),
    circle:
      next.circle !== beforeCircle
        ? { userId, from: beforeCircle, to: next.circle }
        : undefined,
  };
}

export function repayForSeat(
  session: GameSession,
  userId: string,
  amount: number
): SessionCommandResult {
  const denied = requireCurrentPlayer(session, userId);
  if (denied) return denied;
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail(session, "BAD_AMOUNT", "还款金额无效");
  }
  const seat = session.seats.find((item) => item.userId === userId)!;
  const result = repayDebt(seat.state, amount);
  if (result.paid <= 0) {
    return fail(session, "NO_REPAYMENT", "没有可偿还的负债，或现金不足");
  }
  seat.state = result.state;
  session.started = true;
  session.revision += 1;
  return ok(session);
}

export function appendChat(
  session: GameSession,
  input: { userId: string; nickname?: string; content: string }
): SessionCommandResult {
  const content = input.content.trim().slice(0, 500);
  if (!content) {
    return fail(session, "EMPTY_CHAT", "消息不能为空");
  }
  const seat = session.seats.find((item) => item.userId === input.userId);
  const line = {
    userId: input.userId,
    nickname: input.nickname?.trim() || seat?.nickname || input.userId,
    content,
    at: Date.now(),
  };
  session.chat = [...session.chat, line].slice(-CHAT_LIMIT);
  session.revision += 1;
  return { ...ok(session), chat: line };
}
