"use client";

import { Button, Card, Col, Row, Space, Tag, Typography } from "antd";
import Link from "next/link";
import { useState } from "react";
import { WheelBoardSvg } from "@/components/wheel/WheelBoardSvg";
import { TILE_COLORS } from "@/components/wheel/wheel-utils";
import type { BoardTile } from "@/types/game";

export default function WheelPrototypePage() {
  const [selected, setSelected] = useState<BoardTile | null>(null);
  const [active, setActive] = useState<{ track: "outer" | "inner"; index: number }>({
    track: "outer",
    index: 0,
  });

  const handleTileClick = (tile: BoardTile) => {
    setSelected(tile);
    setActive({ track: tile.track, index: tile.index });
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Space align="center" className="mb-2">
          <Typography.Title level={2} style={{ color: "#d4a853", margin: 0 }}>
            人生跃迁 · 轮盘原型
          </Typography.Title>
          <Tag color="gold">Prototype v1</Tag>
        </Space>
        <Typography.Paragraph type="secondary" className="mb-6">
          依据设计稿还原：外圈 24 格（牛马圈）+ 内圈 16 格（老板/核心圈）+ 中心六维人生目标。
          悬停/点击格子可查看详情。
        </Typography.Paragraph>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <Card
              styles={{ body: { background: "#0a0e1a", padding: 12 } }}
              bordered={false}
              className="border border-gold/20"
            >
              <WheelBoardSvg
                activePosition={active}
                onTileClick={handleTileClick}
              />
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card title="格子详情" className="mb-4">
              {selected ? (
                <Space direction="vertical" size="small">
                  <Tag color="gold">
                    {selected.track === "outer" ? "外圈" : "内圈"} #{selected.index + 1}
                  </Tag>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {TILE_COLORS[selected.type]?.icon}{" "}
                    {selected.label}
                  </Typography.Title>
                  <Typography.Text type="secondary">类型：{selected.type}</Typography.Text>
                  {selected.isStart && <Tag color="red">起点 START</Tag>}
                </Space>
              ) : (
                <Typography.Text type="secondary">点击轮盘上的格子</Typography.Text>
              )}
            </Card>

            <Card title="圈层说明" size="small" className="mb-4">
              <ul className="space-y-2 text-sm text-gray-300">
                <li>
                  <Tag color="blue">外圈</Tag> 牛马圈 · 24 格 · 劳动收入阶段
                </li>
                <li>
                  <Tag color="purple">内圈</Tag> 老板/核心圈 · 16 格 · 资本与人生意义
                </li>
                <li>
                  <Tag color="gold">中心</Tag> 六维终极目标（∞）
                </li>
              </ul>
            </Card>

            <Card title="图例" size="small">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TILE_COLORS).map(([type, s]) => (
                  <div
                    key={type}
                    className="flex items-center gap-2 rounded border border-white/10 px-2 py-1 text-xs"
                    style={{ background: s.fill }}
                  >
                    <span>{s.icon}</span>
                    <span style={{ color: s.stroke }}>{type}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Space className="mt-4">
              <Link href="/game/demo">
                <Button type="primary">进入游戏界面</Button>
              </Link>
              <Link href="/lobby">
                <Button>返回大厅</Button>
              </Link>
            </Space>
          </Col>
        </Row>
      </div>
    </main>
  );
}
