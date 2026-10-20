"use client";

import { Alert, Card, Col, List, Row, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CardDrawer } from "@/components/card/CardDrawer";
import { DecisionModal } from "@/components/card/DecisionModal";
import { CashFlowPanel } from "@/components/cash-flow/CashFlowPanel";
import { CircleProgressPanel } from "@/components/cash-flow/CircleProgressPanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { DiceRoller } from "@/components/dice/DiceRoller";
import { GameWheel } from "@/components/wheel/GameWheel";
import { getStoredUser } from "@/lib/client/user";
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

  const boardSeats = (snapshot?.seats ?? []).filter((seat) => seat.role !== "banker");
  const tokens = boardSeats.map((seat, index) => ({
    id: seat.userId,
    label: seat.nickname || seat.state.identityName || seat.userId,
    track: seat.state.track,
    index: seat.state.boardIndex,
    color: TOKEN_COLORS[index % TOKEN_COLORS.length],
    active: seat.userId === snapshot?.currentUserId,
    dice:
      seat.userId === snapshot?.lastActorUserId ? seat.state.lastDice : null,
  }));
  const turnSeat = snapshot?.seats.find(
    (seat) => seat.userId === snapshot.currentUserId
  );
  const activeSeat =
    turnSeat && turnSeat.role !== "banker"
      ? turnSeat
      : boardSeats.find((seat) => seat.userId === userId);

  useEffect(() => {
    if (!player.identityId) {
      router.replace(`/room/${roomId}/identity`);
    }
  }, [player.identityId, roomId, router]);

  return (
    <main className="ll-page ll-page-xl min-h-screen">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Typography.Title level={4} className="ll-title">
          人生跃迁 · {player.identityName ?? nickname}
        </Typography.Title>
        <Space wrap size={[8, 8]}>
          {player.identityName && (
            <Tag color="blue">{player.identityName}</Tag>
          )}
          {player.identityTier && (
            <Tag>{player.identityTier === "high" ? "高产" : player.identityTier === "middle" ? "中产" : "低产"}</Tag>
          )}
          <Tag color="gold">第 {player.round} 回合</Tag>
          <Tag>{circle}圈</Tag>
          {player.windFireWheel && <Tag color="orange">风火轮</Tag>}
          <Tag color={connected && synced ? "success" : "default"}>
            {connected && synced ? "服务端对局" : connected ? "同步中" : "未连接"}
          </Tag>
          <Tag color={isMyTurn ? "gold" : "default"}>
            {turnSeat
              ? isMyTurn
                ? "轮到你"
                : `轮到 ${turnSeat.nickname}`
              : "等待入座"}
          </Tag>
          <Link href={`/room/${roomId}`}>返回房间</Link>
        </Space>
      </div>

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
              renderItem={(item) => (
                <List.Item className="py-1 text-xs text-gray-400">
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
    </main>
  );
}
