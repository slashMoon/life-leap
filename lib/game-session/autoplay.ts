import { appendLog } from "@/lib/game-engine/player-finance";
import type { PlayerRuntimeState } from "@/types/player";
import { decideForSeat, joinSeat, rollForSeat, toSnapshot } from "./engine";
import { timingFor } from "./timing";
import type { GameSession, JoinSeatInput, SessionCommandResult } from "./types";

export type AutoKind = "bot" | "timeout";

export type AutoPlan =
  | { userId: string; kind: "bot"; delayMs: number }
  | { userId: string; kind: "timeout"; deadlineAt: number }
  | null;

/** 现金够就参与，不够就放弃。 */
export function shouldAcceptPending(state: PlayerRuntimeState) {
  return state.pendingDecision?.preview.canAfford === true;
}

export function autoplayPlan(session: GameSession, now: number): AutoPlan {
  const userId = session.currentUserId;
  if (!userId) return null;
  const seat = session.seats.find((item) => item.userId === userId);
  if (!seat || seat.role === "banker") return null;
  const timing = timingFor(session.roomId);
  if (seat.bot) {
    return { userId, kind: "bot", delayMs: timing.botDelayMs };
  }
  if (!seat.connected && session.started) {
    return {
      userId,
      kind: "timeout",
      deadlineAt: session.turnDeadlineAt ?? now + timing.disconnectMs,
    };
  }
  return null;
}

export function seatBots(session: GameSession, bots: JoinSeatInput[] | undefined) {
  if (!bots?.length) return;
  for (const bot of bots) {
    if (!bot.userId) continue;
    const existing = session.seats.find((seat) => seat.userId === bot.userId);
    if (existing) {
      if (!existing.bot && existing.role !== "banker") continue;
      existing.bot = true;
      existing.connected = true;
      if (bot.nickname) existing.nickname = bot.nickname;
      continue;
    }
    joinSeat(session, {
      userId: bot.userId,
      nickname: bot.nickname,
      role: "player",
      order: bot.order,
      identityId: bot.identityId,
      coreNetWorthThreshold: bot.coreNetWorthThreshold,
      corePassiveIncomeMultiplier: bot.corePassiveIncomeMultiplier,
    });
    const seated = session.seats.find((seat) => seat.userId === bot.userId);
    if (!seated) continue;
    seated.bot = true;
    seated.connected = true;
  }
}

export function clearDeadlineIfCurrentConnected(session: GameSession) {
  if (session.turnDeadlineAt == null) return false;
  const current = session.seats.find((seat) => seat.userId === session.currentUserId);
  if (!current?.connected || current.bot) return false;
  session.turnDeadlineAt = null;
  session.revision += 1;
  return true;
}

export function applyAutoAction(
  session: GameSession,
  userId: string,
  kind: AutoKind
): SessionCommandResult & { skipped?: boolean } {
  if (session.currentUserId !== userId) {
    return { ok: true, skipped: true, snapshot: toSnapshot(session) };
  }
  const seat = session.seats.find((item) => item.userId === userId);
  if (!seat || seat.role === "banker") {
    return { ok: true, skipped: true, snapshot: toSnapshot(session) };
  }
  if (kind === "bot" && !seat.bot) {
    return { ok: true, skipped: true, snapshot: toSnapshot(session) };
  }
  if (kind === "timeout" && (seat.connected || seat.bot)) {
    return { ok: true, skipped: true, snapshot: toSnapshot(session) };
  }

  session.turnDeadlineAt = null;
  const reason = kind === "timeout" ? "timeout" : "bot";

  if (seat.state.pendingDecision) {
    let result = decideForSeat(session, userId, shouldAcceptPending(seat.state));
    const updated = session.seats.find((item) => item.userId === userId);
    if (updated?.state.pendingDecision) {
      result = decideForSeat(session, userId, false);
    }
    if (result.dice) result.dice.reason = reason;
    return result;
  }

  if (kind === "timeout") {
    seat.state = appendLog(seat.state, "等待超时，系统代为掷骰");
  }
  const result = rollForSeat(session, userId);
  if (result.dice) result.dice.reason = reason;
  return result;
}
