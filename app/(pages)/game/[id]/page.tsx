"use client";

import { Alert, Button, Empty, List } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { CircleBanner, CircleCeremony } from "@/components/ceremony/CircleCeremony";
import { useCeremonyPreview } from "@/components/ceremony/useCeremonyPreview";
import { CardDrawer } from "@/components/card/CardDrawer";
import { DecisionModal } from "@/components/card/DecisionModal";
import { CashFlowPanel } from "@/components/cash-flow/CashFlowPanel";
import { CircleProgressPanel } from "@/components/cash-flow/CircleProgressPanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { DiceRoller } from "@/components/dice/DiceRoller";
import { GameWheel } from "@/components/wheel/GameWheel";
import { TileLegend } from "@/components/wheel/TileLegend";
import { ParlorFelt } from "@/components/table/ParlorFelt";
import type { SeatPlaqueModel } from "@/components/table/SeatPlaque";
import { getStoredUser } from "@/lib/client/user";
import { orderAroundSelf } from "@/lib/table/seat-layout";
import { useCircleCeremony } from "@/hooks/useCircleCeremony";
import { useGame } from "@/hooks/useGame";
import { apiFetch } from "@/lib/api/fetch";
import type { RoomDetail } from "@/hooks/useRoom";
import type { GameMode } from "@/types/game";
import type { GameSnapshot } from "@/lib/game-session/types";

const TOKEN_COLORS = ["#d4a853", "#7eb6ff", "#7dcea0", "#f1948a", "#c39bd3", "#f7dc6f"];

function seatColor(seats: { userId: string }[], userId: string) {
  const index = seats.findIndex((seat) => seat.userId === userId);
  return TOKEN_COLORS[(index < 0 ? 0 : index) % TOKEN_COLORS.length];
}

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  const { userId, nickname } = getStoredUser();
  const [table, setTable] = useState<{ mode?: GameMode; code?: string }>({});
  const [focusId, setFocusId] = useState(userId);
  const {
    player,
    snapshot,
    rollDice,
    isRolling,
    connected,
    synced,
    isMyTurn,
    circle,
    resolveDecision,
    hasPendingDecision,
    repay,
    socket,
  } = useGame(roomId, userId, nickname);
  const ceremony = useCircleCeremony(snapshot, userId);
  const preview = useCeremonyPreview(nickname);
  const fullView = preview.full ?? ceremony.full;
  const banner = preview.banner ?? (ceremony.light
    ? { nickname: ceremony.light.nickname, to: ceremony.light.to, userId: ceremony.light.userId }
    : null);

  const boardSeats = (snapshot?.seats ?? []).filter((seat) => seat.role !== "banker");
  const glowId =
    banner?.userId ??
    (banner ? boardSeats.find((seat) => seat.userId !== userId)?.userId : undefined);
  const tokens = boardSeats.map((seat) => ({
    id: seat.userId,
    label: seat.nickname || seat.state.identityName || seat.userId,
    track: seat.state.track,
    index: seat.state.boardIndex,
    color: seatColor(boardSeats, seat.userId),
    active: seat.userId === snapshot?.currentUserId,
    dice: seat.userId === snapshot?.lastActorUserId ? seat.state.lastDice : null,
    glow: glowId === seat.userId,
  }));
  const turnSeat = snapshot?.seats.find((seat) => seat.userId === snapshot.currentUserId);
  const activeSeat =
    turnSeat && turnSeat.role !== "banker"
      ? turnSeat
      : boardSeats.find((seat) => seat.userId === userId);
  const actor = snapshot?.seats.find((seat) => seat.userId === snapshot.lastActorUserId);
  const shownDice =
    actor && actor.userId !== userId ? actor.state.lastDice : player.lastDice;
  const rollCue =
    actor && actor.userId !== userId && actor.state.lastDice != null
      ? {
          key: `${actor.userId}:${actor.state.boardIndex}:${actor.state.lastDice}`,
          value: actor.state.lastDice,
        }
      : null;
  const [now, setNow] = useState(() => Date.now());
  const deadline = !turnSeat?.bot ? snapshot?.turnDeadlineAt ?? null : null;

  useEffect(() => {
    if (!deadline) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const remain =
    deadline != null ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;
  const waitHint =
    synced && !isMyTurn && turnSeat && turnSeat.role !== "banker"
      ? `等待 ${turnSeat.nickname} ${turnSeat.state.pendingDecision ? "决策" : "掷骰"}${
          remain != null ? ` · ${remain}s` : ""
        }`
      : undefined;
  const otherLines = boardSeats
    .filter((seat) => seat.userId !== userId && seat.state.eventLog[0])
    .map((seat) => `${seat.nickname} · ${seat.state.eventLog[0]}`);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<RoomDetail>(`/api/room/${roomId}`)
      .then((room) => {
        if (!cancelled) setTable({ mode: room.mode, code: room.code });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    if (player.identityId || !synced) return;
    const previewing = new URLSearchParams(window.location.search).has("ceremony");
    if (previewing) return;
    router.replace(`/room/${roomId}/identity`);
  }, [player.identityId, synced, roomId, router]);

  const plaques = plaqueSeats({
    snapshot,
    boardSeats,
    userId,
    nickname,
    synced,
    player,
    remain,
  });
  const focus =
    boardSeats.find((seat) => seat.userId === focusId) ??
    boardSeats.find((seat) => seat.userId === userId);
  const focusSelf = !focus || focus.userId === userId;
  const focusState = focusSelf ? player : focus.state;
  const feed = focusSelf
    ? player.lastEvent
    : actor && actor.userId !== userId
      ? actor.state.lastEvent
      : player.lastEvent;
  const feedTile = focusSelf
    ? player.lastTile
    : actor && actor.userId !== userId
      ? actor.state.lastTile
      : player.lastTile;
  const feedName =
    !focusSelf && actor && actor.userId !== userId ? actor.nickname : null;

  const openLedger = (id: string) => {
    setFocusId(id);
  };

  const modeLabel =
    (snapshot?.mode ?? table.mode) === "solo"
      ? "单机"
      : (snapshot?.mode ?? table.mode) === "multi"
        ? `多人 · ${table.code || roomId.slice(-4).toUpperCase()}`
        : "读取模式";
  const tierLabel =
    player.identityTier === "high"
      ? "高产"
      : player.identityTier === "middle"
        ? "中产"
        : player.identityTier === "low"
          ? "低产"
          : null;
  const linkLabel = connected && synced ? "服务端对局" : connected ? "同步中" : "未连接";
  const turnLabel = turnSeat ? (isMyTurn ? "轮到你" : `轮到 ${turnSeat.nickname}`) : "等待入座";
  const flowValue = player.cashFlow.cashFlow;
  const selfColor = seatColor(boardSeats, userId);

  const eventTitle = hasPendingDecision
    ? "请先完成决策"
    : feed?.message
      ? `${feedName ? `${feedName} · ` : ""}${feedTile?.label ?? "格子事件"}`
      : (waitHint ?? turnLabel);
  const eventBody = hasPendingDecision
    ? "到达进修学习或机会格子，请选择是否参与后再掷下一骰。"
    : feed?.message ?? "掷骰子后棋子会移动到对应格子";

  return (
    <AppShell
      step="game"
      roomId={roomId}
      title={player.identityName ?? nickname}
      kicker="对局"
      width="wide"
      compact
      mainClassName="ll-game"
    >
      {!connected && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="掷骰与账本由服务端计算。请同时启动 Socket 服务（pnpm dev:all）后再操作。"
        />
      )}
      {connected && !synced && (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="正在从服务端同步对局状态…"
        />
      )}

      <div className="ll-board">
        <aside className="ll-col ll-col-player" aria-label="玩家进度">
          <section className="ll-panel ll-player">
            <div className="ll-player-top">
              <span className="ll-avatar" style={{ background: selfColor }} aria-hidden>
                {(nickname || "我").slice(0, 1)}
              </span>
              <div className="min-w-0">
                <h1 className="ll-player-name">{nickname}</h1>
                <p className="ll-player-sub">
                  {[player.identityName, tierLabel, `${circle}圈`].filter(Boolean).join(" · ")}
                  {player.windFireWheel ? " · 风火轮" : ""}
                </p>
              </div>
            </div>
            <p className="ll-kicker ll-flow-kicker">月现金流</p>
            <p className={`ll-hero-num ${flowValue >= 0 ? "is-up" : "is-down"}`}>
              {flowValue >= 0 ? "+" : ""}
              {flowValue.toLocaleString("zh-CN")}
            </p>
            <div className="ll-points">
              <span>
                时间积分
                <b>{player.timePoints ?? 0}</b>
              </span>
              <span>
                品质生活积分
                <b>{player.qualityLifePoints ?? 0}</b>
              </span>
            </div>
            <p className="ll-player-status">
              第 {player.round} 回合 · {modeLabel} · {linkLabel} · {turnLabel}
              {remain != null && !isMyTurn ? ` · ${remain}s` : ""}
            </p>
          </section>

          <div className="ll-panel ll-progress">
            <CircleProgressPanel player={player} />
          </div>

          <section className="ll-panel ll-event" aria-live="polite">
            <h2>{eventTitle}</h2>
            <p>{eventBody}</p>
          </section>

          <CardDrawer
            visible={!!player.lastEvent?.cardTitle && !player.lastEvent.requiresDecision}
            cardName={player.lastEvent?.cardTitle}
            cardContent={player.lastEvent?.cardContent}
          />

          <TileLegend track={player.track} />
        </aside>

        <section className="ll-col ll-col-table" aria-labelledby="ll-table-title">
          <h2 id="ll-table-title" className="ll-table-title">
            转动人生
          </h2>
          <ParlorFelt seats={plaques} onSelect={openLedger}>
            <GameWheel
              activePosition={{
                track: activeSeat?.state.track ?? player.track,
                index: activeSeat?.state.boardIndex ?? player.boardIndex,
              }}
              lastDice={activeSeat?.state.lastDice ?? player.lastDice}
              playerLabel={nickname}
              tokens={tokens}
              orbit={fullView?.to ?? circle}
            />
          </ParlorFelt>

          <div className={`ll-stage-dock${isMyTurn && !hasPendingDecision ? " is-live" : ""}`}>
            <p className="ll-round-line">
              第 {player.round} 回合 · {turnLabel}
              {remain != null && !isMyTurn ? ` · ${remain}s` : ""}
            </p>
            <DiceRoller
              variant="stage"
              value={shownDice}
              onRoll={rollDice}
              loading={isRolling}
              disabled={!connected || !synced || !isMyTurn || hasPendingDecision}
              hint={waitHint}
              rollCue={rollCue}
            />
            <ChatPanel
              variant="dock"
              roomId={roomId}
              userId={userId}
              nickname={nickname}
              socket={socket}
              messages={snapshot?.chat ?? []}
            />
          </div>
        </section>

        <aside
          className="ll-col ll-col-ledger"
          aria-label={focusSelf ? "我的账本" : `${focus?.nickname ?? "玩家"}的账本`}
        >
          {focusSelf ? null : (
            <div className="ll-sheet-bar ll-panel">
              <strong>{focus?.nickname ?? "玩家"}的账本</strong>
              <Button size="small" onClick={() => setFocusId(userId)}>
                我的账本
              </Button>
            </div>
          )}
          <CashFlowPanel
            cashFlow={focusState.cashFlow}
            circle={focusState.circle}
            cash={focusState.cash}
            nativeLiabilities={focusState.nativeLiabilities}
            bankLoan={focusState.bankLoan}
            creditCardDebt={focusState.creditCardDebt}
            timePoints={focusState.timePoints}
            qualityLifePoints={focusState.qualityLifePoints}
            holdings={focusState.holdings}
            round={focusState.round}
            onRepay={focusSelf && isMyTurn ? repay : undefined}
          />
          {focusSelf ? null : (
            <div className="ll-panel ll-progress">
              <CircleProgressPanel player={focusState} />
            </div>
          )}
          <details className="ll-panel ll-log">
            <summary>回合日志</summary>
            <List
              size="small"
              dataSource={[...otherLines, ...player.eventLog]}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这一局还没有落子" /> }}
              renderItem={(item) => (
                <List.Item className="!px-0 py-1 text-xs text-[var(--ll-muted)]">{item}</List.Item>
              )}
            />
          </details>
        </aside>
      </div>

      <DecisionModal
        pending={player.pendingDecision}
        onAccept={() => resolveDecision(true)}
        onDecline={() => resolveDecision(false)}
      />

      {fullView && (
        <CircleCeremony
          view={fullView}
          onDone={preview.full ? preview.clearFull : ceremony.dismissFull}
        />
      )}
      {banner && (
        <CircleBanner
          nickname={banner.nickname}
          to={banner.to}
          onDone={preview.banner ? preview.clearBanner : ceremony.dismissLight}
        />
      )}
      {preview.dev && (
        <div className="ll-ceremony-dev">
          <button type="button" onClick={preview.playBoss}>演示 · 老板圈</button>
          <button type="button" onClick={preview.playCore}>演示 · 核心圈</button>
          <button type="button" onClick={preview.playOther}>演示 · 他人跃迁</button>
        </div>
      )}
    </AppShell>
  );
}

function plaqueSeats({
  snapshot,
  boardSeats,
  userId,
  nickname,
  synced,
  player,
  remain,
}: {
  snapshot: GameSnapshot | null;
  boardSeats: GameSnapshot["seats"];
  userId: string;
  nickname: string;
  synced: boolean;
  player: GameSnapshot["seats"][number]["state"];
  remain: number | null;
}): SeatPlaqueModel[] {
  if (!snapshot || boardSeats.length === 0) {
    return [
      {
        userId,
        nickname,
        identityName: player.identityName,
        cash: synced ? player.cash : undefined,
        circle: synced ? player.circle : undefined,
        cashFlow: synced ? player.cashFlow.cashFlow : undefined,
        color: TOKEN_COLORS[0],
        active: false,
        self: true,
        offline: false,
      },
    ];
  }

  const ring = orderAroundSelf(boardSeats, userId);

  return ring.map((seat) => {
    const offline = !seat.connected && !seat.bot;
    const current = seat.userId === snapshot.currentUserId;
    return {
      userId: seat.userId,
      nickname: seat.nickname,
      identityName: seat.state.identityName,
      cash: seat.state.cash,
      circle: seat.state.circle,
      cashFlow: seat.state.cashFlow.cashFlow,
      color: seatColor(boardSeats, seat.userId),
      active: current,
      self: seat.userId === userId,
      bot: seat.bot,
      offline,
      countdown: offline && current ? remain : null,
    };
  });
}
