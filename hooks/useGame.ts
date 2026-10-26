"use client";

import { useCallback, useEffect } from "react";
import { message } from "antd";
import { apiFetch } from "@/lib/api/fetch";
import { getSelectedIdentity } from "@/lib/client/identity";
import type { RoomDetail } from "@/hooks/useRoom";
import { useGameStore } from "@/stores/game-store";
import type { GameSnapshot } from "@/lib/game-session/types";
import type { GameMode } from "@/types/game";
import type { IdentityId, RoomPlayerRole } from "@/types/identity";
import { useSocket } from "./useSocket";
import type { PlayerRuntimeState } from "@/types/player";

function playerStamp(state: PlayerRuntimeState) {
  return [
    state.boardIndex,
    state.track,
    state.cash,
    state.circle,
    state.round,
    state.lastDice ?? "",
    state.pendingDecision ? "1" : "0",
    state.eventLog.length,
    state.eventLog[0] ?? "",
    state.holdings.length,
    state.cashFlow.totalLiabilities,
  ].join("|");
}

export function useGame(roomId: string, userId: string, nickname: string) {
  const { socket, connected } = useSocket(roomId);
  const player = useGameStore((s) => s.player);
  const snapshot = useGameStore((s) => s.snapshot);
  const isRolling = useGameStore((s) => s.isRolling);
  const synced = useGameStore((s) => s.synced);
  const setSession = useGameStore((s) => s.setSession);
  const setRolling = useGameStore((s) => s.setRolling);
  const setPendingAction = useGameStore((s) => s.setPendingAction);
  const applyServerState = useGameStore((s) => s.applyServerState);

  const isMyTurn = synced && snapshot?.currentUserId === userId;
  const hasPendingDecision = !!player.pendingDecision;

  useEffect(() => {
    setSession(roomId, userId);
  }, [roomId, userId, setSession]);

  useEffect(() => {
    if (!socket) return;

    const join = async () => {
      const selected = getSelectedIdentity(roomId, userId) ?? undefined;
      let identityId: IdentityId | undefined = selected ?? undefined;
      let role: RoomPlayerRole = "player";
      let order: number | undefined;
      let coreNetWorthThreshold: number | undefined;
      let corePassiveIncomeMultiplier: number | undefined;
      let mode: GameMode | undefined;
      let companions:
        | Array<{
            userId: string;
            nickname?: string;
            order?: number;
            identityId?: IdentityId;
          }>
        | undefined;
      try {
        const room = await apiFetch<RoomDetail>(`/api/room/${roomId}`);
        const me = room.players?.find(
          (item) => item.userId === userId || item.nickname === nickname
        );
        if (me?.role === "banker") role = "banker";
        if (typeof me?.order === "number") order = me.order;
        if (me?.identityId) identityId = me.identityId;
        coreNetWorthThreshold = room.config?.coreNetWorthThreshold;
        corePassiveIncomeMultiplier = room.config?.corePassiveIncomeMultiplier;
        if (room.mode === "solo" || room.mode === "multi") mode = room.mode;
        const bots = (room.players ?? []).filter(
          (item) => item.bot && item.userId !== userId && item.role !== "banker"
        );
        if (bots.length) {
          companions = bots.map((item) => ({
            userId: item.userId,
            nickname: item.nickname,
            order: item.order,
            identityId: item.identityId,
          }));
        }
      } catch {
        /* 没有房间接口时仍以本地身份入座，服务端用医生身份兜底 */
      }
      if (!socket.connected) return;
      socket.emit("room:join", {
        roomId,
        userId,
        nickname,
        playing: true,
        role,
        order,
        identityId,
        coreNetWorthThreshold,
        corePassiveIncomeMultiplier,
        mode,
        companions,
      });
    };

    const onState = (next: GameSnapshot) => {
      const store = useGameStore.getState();
      const before = store.player;
      const action = store.pendingAction;
      const after =
        next.seats.find((seat) => seat.userId === userId)?.state ?? before;
      const changed = playerStamp(before) !== playerStamp(after);
      const previous = store.snapshot;
      applyServerState(next, userId);
      const actorId = next.lastActorUserId;
      if (previous && actorId && actorId !== userId) {
        const prior = previous.seats.find((seat) => seat.userId === actorId)?.state;
        const acted = next.seats.find((seat) => seat.userId === actorId);
        if (acted) {
          const moved = prior?.boardIndex !== acted.state.boardIndex;
          const eventText = acted.state.lastEvent?.message;
          const eventChanged = eventText && eventText !== prior?.lastEvent?.message;
          if (moved && acted.state.lastDice != null) {
            const tile = acted.state.lastTile?.label ?? "格子";
            const extra = eventChanged && !acted.state.pendingDecision ? ` · ${eventText}` : "";
            message.info(`${acted.nickname} 掷出 ${acted.state.lastDice} 点 → ${tile}${extra}`);
          } else if (eventChanged) {
            message.info(`${acted.nickname}：${eventText}`);
          }
        }
      }
      if (!action || !changed) return;
      setPendingAction(null);
      if (action === "roll") {
        setRolling(false);
        const tileLabel = after.lastTile?.label ?? "";
        message.success(`🎲 ${after.lastDice} 点 → ${tileLabel}`);
        if (after.pendingDecision) {
          message.info("请决定是否参与本次机会/进修");
        } else if (after.circle !== before.circle) {
          message.success(`圈层跃迁：${before.circle} → ${after.circle}`);
        }
      } else if (action === "decide") {
        if (after.pendingDecision) {
          message.error(after.lastEvent?.message ?? "现金不足，无法参与");
        } else if (after.lastEvent?.message?.startsWith("放弃")) {
          message.info(after.lastEvent.message);
        } else {
          message.success(after.lastEvent?.message ?? "已处理决策");
          if (after.circle !== before.circle) {
            message.success(`圈层跃迁：${before.circle} → ${after.circle}`);
          }
        }
      } else if (action === "repay") {
        const paid = before.cash - after.cash;
        if (paid > 0) message.success(`已偿还 ${paid.toLocaleString()} 元`);
        else message.info("没有可偿还的负债，或现金不足");
      }
    };

    const onError = (payload: { code: string; message: string }) => {
      setRolling(false);
      setPendingAction(null);
      message.error(payload.message);
    };

    socket.on("connect", join);
    socket.on("game:state", onState);
    socket.on("error", onError);
    if (socket.connected) void join();

    return () => {
      socket.off("connect", join);
      socket.off("game:state", onState);
      socket.off("error", onError);
    };
  }, [
    socket,
    roomId,
    userId,
    nickname,
    applyServerState,
    setPendingAction,
    setRolling,
  ]);

  const rollDice = useCallback(async () => {
    const store = useGameStore.getState();
    if (
      !socket?.connected ||
      !store.synced ||
      store.snapshot?.currentUserId !== userId ||
      store.isRolling ||
      store.player.pendingDecision
    ) {
      return;
    }
    setRolling(true);
    setPendingAction("roll");
    socket.emit("game:roll-dice", { roomId, userId });
    const started = Date.now();
    while (Date.now() - started < 8000) {
      if (!useGameStore.getState().isRolling) return;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    setRolling(false);
    setPendingAction(null);
  }, [socket, roomId, userId, setRolling, setPendingAction]);

  const resolveDecision = useCallback(
    (accept: boolean) => {
      if (!socket?.connected) {
        message.error("未连接对局服务，无法提交决策");
        return;
      }
      const store = useGameStore.getState();
      if (store.snapshot?.currentUserId !== userId) {
        message.error("还没轮到你");
        return;
      }
      setPendingAction("decide");
      socket.emit("game:decide", { roomId, userId, accept });
    },
    [socket, roomId, userId, setPendingAction]
  );

  const repay = useCallback(
    (amount: number) => {
      if (!socket?.connected) {
        message.error("未连接对局服务，无法还款");
        return;
      }
      const store = useGameStore.getState();
      if (store.snapshot?.currentUserId !== userId) {
        message.error("还没轮到你");
        return;
      }
      setPendingAction("repay");
      socket.emit("game:repay", { roomId, userId, amount });
    },
    [socket, roomId, userId, setPendingAction]
  );

  return {
    player,
    snapshot,
    isRolling,
    connected,
    synced,
    isMyTurn,
    rollDice,
    resolveDecision,
    repay,
    hasPendingDecision,
    circle: player.circle,
    cashFlow: player.cashFlow,
    socket,
  };
}
