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

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  const { userId, nickname } = getStoredUser();
  const {
    player,
    rollDice,
    isRolling,
    connected,
    circle,
    cashFlow,
    resolveDecision,
    hasPendingDecision,
    repay,
  } = useGame(roomId, userId);

  useEffect(() => {
    if (!player.identityId) {
      router.replace(`/room/${roomId}/identity`);
    }
  }, [player.identityId, roomId, router]);

  return (
    <main className="min-h-screen p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Typography.Title level={4} style={{ color: "#d4a853", margin: 0 }}>
          人生跃迁 · {player.identityName ?? nickname}
        </Typography.Title>
        <Space>
          {player.identityName && (
            <Tag color="blue">{player.identityName}</Tag>
          )}
          {player.identityTier && (
            <Tag>{player.identityTier === "high" ? "高产" : player.identityTier === "middle" ? "中产" : "低产"}</Tag>
          )}
          <Tag color="gold">第 {player.round} 回合</Tag>
          <Tag>{circle}圈</Tag>
          {player.windFireWheel && <Tag color="orange">风火轮</Tag>}
          <Tag color={connected ? "success" : "default"}>
            {connected ? "在线同步" : "本地 Mock"}
          </Tag>
          <Link href={`/room/${roomId}`}>返回房间</Link>
        </Space>
      </div>

      {!connected && (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="当前为本地 Mock 模式，掷骰与结算在浏览器内运行，无需 Socket 服务。"
          closable
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <GameWheel
            activePosition={{
              track: player.track,
              index: player.boardIndex,
            }}
            lastDice={player.lastDice}
            playerLabel={nickname}
          />

          <Space className="mt-4" direction="vertical" size="middle">
            <DiceRoller
              value={player.lastDice}
              onRoll={rollDice}
              loading={isRolling}
              disabled={hasPendingDecision}
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
            onRepay={repay}
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
            <ChatPanel roomId={roomId} userId={userId} />
          </div>
        </Col>
      </Row>
    </main>
  );
}
