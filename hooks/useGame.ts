"use client";

import { useCallback, useEffect } from "react";
import { message } from "antd";
import { executeTurn } from "@/lib/game-engine/play-turn";
import {
  loadPlayerState,
  savePlayerState,
} from "@/lib/game-engine/tile-effects";
import { useGameStore } from "@/stores/game-store";
import { useSocket } from "./useSocket";

export function useGame(roomId: string, userId: string) {
  const { socket, connected } = useSocket(roomId);
  const player = useGameStore((s) => s.player);
  const isRolling = useGameStore((s) => s.isRolling);
  const setSession = useGameStore((s) => s.setSession);
  const setPlayer = useGameStore((s) => s.setPlayer);
  const setRolling = useGameStore((s) => s.setRolling);
  const applyTurnResult = useGameStore((s) => s.applyTurnResult);
  const resolveDecisionStore = useGameStore((s) => s.resolveDecision);

  useEffect(() => {
    setSession(roomId, userId);
    setPlayer(loadPlayerState(roomId, userId));
  }, [roomId, userId, setSession, setPlayer]);

  useEffect(() => {
    if (!socket) return;
    socket.emit("room:join", { roomId, userId });
  }, [socket, roomId, userId]);

  const persist = useCallback(
    (state: typeof player) => {
      savePlayerState(roomId, userId, state);
    },
    [roomId, userId]
  );

  const rollDice = useCallback(async () => {
    const store = useGameStore.getState();
    if (store.isRolling || store.player.pendingDecision) return;
    setRolling(true);

    await new Promise((r) => setTimeout(r, 700));

    const current = useGameStore.getState().player;
    const next = executeTurn(current);
    applyTurnResult(next);
    persist(next);

    if (connected && socket?.connected) {
      socket.emit("game:roll-dice", { roomId, userId });
    }

    const tileLabel = next.lastTile?.label ?? "";
    message.success(`🎲 ${next.lastDice} 点 → ${tileLabel}`);

    if (next.pendingDecision) {
      message.info("请决定是否参与本次机会/进修");
    } else if (next.lastEvent?.circle && next.lastEvent.circle !== current.circle) {
      message.success(`圈层跃迁：${current.circle} → ${next.lastEvent.circle}`);
    }
  }, [roomId, userId, setRolling, applyTurnResult, persist, connected, socket]);

  const resolveDecision = useCallback(
    (accept: boolean) => {
      const before = useGameStore.getState().player;
      resolveDecisionStore(accept);
      const after = useGameStore.getState().player;

      persist(after);

      if (accept && after.pendingDecision) {
        message.error(after.lastEvent?.message ?? "现金不足，无法参与");
        return;
      }

      if (accept) {
        message.success(`已参与 · ${before.pendingDecision?.cardName ?? ""}`);
        if (after.lastEvent?.circle && after.lastEvent.circle !== before.circle) {
          message.success(`圈层跃迁：${before.circle} → ${after.lastEvent.circle}`);
        }
      } else {
        message.info(`已放弃 · ${before.pendingDecision?.cardName ?? ""}`);
      }
    },
    [resolveDecisionStore, persist]
  );

  return {
    player,
    isRolling,
    connected,
    rollDice,
    resolveDecision,
    hasPendingDecision: !!player.pendingDecision,
    circle: player.circle,
    cashFlow: player.cashFlow,
  };
}
