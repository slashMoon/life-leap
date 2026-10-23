import {
  applyAutoAction,
  autoplayPlan,
  type AutoKind,
} from "@/lib/game-session/autoplay";
import { mutateSession, readSession } from "@/lib/game-session/store";
import { toSnapshot } from "@/lib/game-session/engine";
import type { GameServer } from "./game-server";

const timers = new Map<string, NodeJS.Timeout>();

export function clearAutoplayTimers() {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
}

function publishState(io: GameServer, roomId: string) {
  return readSession(roomId).then((session) => {
    if (session) io.to(roomId).emit("game:state", toSnapshot(session));
  });
}

export async function scheduleAutoplay(io: GameServer, roomId: string) {
  const pending = timers.get(roomId);
  if (pending) clearTimeout(pending);
  timers.delete(roomId);

  const session = await readSession(roomId);
  if (!session) return;
  const now = Date.now();
  const plan = autoplayPlan(session, now);

  if (!plan) {
    if (session.turnDeadlineAt != null) {
      const cleared = await mutateSession(roomId, (current) => {
        const still = autoplayPlan(current, Date.now());
        if (still || current.turnDeadlineAt == null) return false;
        current.turnDeadlineAt = null;
        current.revision += 1;
        return true;
      });
      if (cleared) await publishState(io, roomId);
    }
    return;
  }

  if (plan.kind === "timeout" && session.turnDeadlineAt == null) {
    await mutateSession(roomId, (current) => {
      if (current.turnDeadlineAt != null) return;
      const next = autoplayPlan(current, Date.now());
      if (next?.kind !== "timeout") return;
      current.turnDeadlineAt = next.deadlineAt;
      current.revision += 1;
    });
    await publishState(io, roomId);
  }

  const latest = await readSession(roomId);
  const fresh = latest ? autoplayPlan(latest, Date.now()) : null;
  if (!fresh || fresh.userId !== plan.userId) {
    if (fresh) await scheduleAutoplay(io, roomId);
    return;
  }

  const wait =
    fresh.kind === "bot"
      ? fresh.delayMs
      : Math.max(0, fresh.deadlineAt - Date.now());
  const timer = setTimeout(() => {
    timers.delete(roomId);
    void runAuto(io, roomId, fresh.userId, fresh.kind);
  }, wait);
  timer.unref();
  timers.set(roomId, timer);
}

async function runAuto(
  io: GameServer,
  roomId: string,
  userId: string,
  kind: AutoKind
) {
  const result = await mutateSession(roomId, (session) =>
    applyAutoAction(session, userId, kind)
  );
  if (result.skipped || !result.ok) {
    await scheduleAutoplay(io, roomId);
    return;
  }
  io.to(roomId).emit("game:state", result.snapshot);
  if (result.dice) io.to(roomId).emit("game:dice-rolled", result.dice);
  if (result.tile) io.to(roomId).emit("game:tile-landed", result.tile);
  if (result.circle) io.to(roomId).emit("game:circle-changed", result.circle);
  await scheduleAutoplay(io, roomId);
}
