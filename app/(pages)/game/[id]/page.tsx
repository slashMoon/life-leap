"use client";

import { Alert, Card, Col, Empty, List, Row, Space, Tag } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
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
import { getStoredUser } from "@/lib/client/user";
import { useCircleCeremony } from "@/hooks/useCircleCeremony";
import { useGame } from "@/hooks/useGame";

const TOKEN_COLORS = ["#d4a853", "#7eb6ff", "#7dcea0", "#f1948a", "#c39bd3", "#f7dc6f"];

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  const { userId, nickname } = getStoredUser();
  const {
    player,
    snapshot,
    rollDice,
    isRolling,
    connected,
    synced,
    isMyTurn,
    circle,
    cashFlow,
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
  const tokens = boardSeats.map((seat, index) => ({
    id: seat.userId,
    label: seat.nickname || seat.state.identityName || seat.userId,
    track: seat.state.track,
    index: seat.state.boardIndex,
    color: TOKEN_COLORS[index % TOKEN_COLORS.length],
    active: seat.userId === snapshot?.currentUserId,
    dice:
      seat.userId === snapshot?.lastActorUserId ? seat.state.lastDice : null,
    glow: glowId === seat.userId,
  }));
  const turnSeat = snapshot?.seats.find(
    (seat) => seat.userId === snapshot.currentUserId
  );
  const activeSeat =
    turnSeat && turnSeat.role !== "banker"
      ? turnSeat
      : boardSeats.find((seat) => seat.userId === userId);

  useEffect(() => {
    if (player.identityId) return;
    const previewing = new URLSearchParams(window.location.search).has("ceremony");
    if (previewing) return;
    router.replace(`/room/${roomId}/identity`);
  }, [player.identityId, roomId, router]);

  return (
    <AppShell
      step="game"
      roomId={roomId}
      title={player.identityName ?? nickname}
      kicker="对局"
      width="xl"
      meta={
        <>
          {player.identityName ? <Tag color="blue">{player.identityName}</Tag> : null}
          {player.identityTier ? (
            <Tag>{player.identityTier === "high" ? "高产" : player.identityTier === "middle" ? "中产" : "低产"}</Tag>
          ) : null}
          <Tag color="gold">第 {player.round} 回合</Tag>
          <Tag>{circle}圈</Tag>
          {player.windFireWheel ? <Tag color="orange">风火轮</Tag> : null}
          <Tag color={connected && synced ? "success" : "default"}>
            {connected && synced ? "服务端对局" : connected ? "同步中" : "未连接"}
          </Tag>
          <Tag color={isMyTurn ? "gold" : "default"}>
            {turnSeat ? (isMyTurn ? "轮到你" : `轮到 ${turnSeat.nickname}`) : "等待入座"}
          </Tag>
        </>
      }
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

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <GameWheel
            activePosition={{
              track: activeSeat?.state.track ?? player.track,
              index: activeSeat?.state.boardIndex ?? player.boardIndex,
            }}
            lastDice={player.lastDice}
            playerLabel={nickname}
            tokens={tokens}
            orbit={fullView?.to ?? circle}
          />

          <Space className="mt-4" direction="vertical" size="middle">
            <DiceRoller
              value={player.lastDice}
              onRoll={rollDice}
              loading={isRolling}
              disabled={!connected || !synced || !isMyTurn || hasPendingDecision}
            />

            {hasPendingDecision && (
              <Alert
                type="warning"
                showIcon
                message="请先完成决策"
                description="到达进修学习或机会格子，请选择是否参与后再掷下一骰。"
              />
            )}

            {player.lastEvent && !player.lastEvent.requiresDecision && (
              <Alert
                type="info"
                showIcon
                message={player.lastTile?.label ?? "格子事件"}
                description={player.lastEvent.message}
              />
            )}

            <CardDrawer
              visible={
                !!player.lastEvent?.cardTitle && !player.lastEvent.requiresDecision
              }
              cardName={player.lastEvent?.cardTitle}
              cardContent={player.lastEvent?.cardContent}
            />

            <DecisionModal
              pending={player.pendingDecision}
              onAccept={() => resolveDecision(true)}
              onDecline={() => resolveDecision(false)}
            />
          </Space>
        </Col>

        <Col xs={24} lg={8}>
          <CashFlowPanel
            cashFlow={cashFlow}
            circle={circle}
            cash={player.cash}
            nativeLiabilities={player.nativeLiabilities}
            bankLoan={player.bankLoan}
            creditCardDebt={player.creditCardDebt}
            timePoints={player.timePoints}
            qualityLifePoints={player.qualityLifePoints}
            holdings={player.holdings}
            onRepay={isMyTurn ? repay : undefined}
          />

          <CircleProgressPanel player={player} />

          <Card title="回合日志" size="small" className="mt-4">
            <List
              size="small"
              dataSource={player.eventLog}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="这一局还没有落子" /> }}
              renderItem={(item) => (
                <List.Item className="!px-0 py-1 text-xs text-[var(--ll-muted)]">
                  {item}
                </List.Item>
              )}
            />
          </Card>

          <div className="mt-4">
            <ChatPanel
              roomId={roomId}
              userId={userId}
              nickname={nickname}
              socket={socket}
              messages={snapshot?.chat ?? []}
            />
          </div>
        </Col>
      </Row>

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
