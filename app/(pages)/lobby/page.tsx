"use client";

import { Button, Card, List, Space, Tag, Typography, message } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useRoom, type RoomListItem } from "@/hooks/useRoom";
import type { RoomConfig } from "@/types/game";
import { MAX_BOARD_PLAYERS } from "@/types/identity";

const defaultConfig: RoomConfig = {
  maxPlayers: MAX_BOARD_PLAYERS,
  totalRounds: 50,
  difficulty: "normal",
  coreNetWorthThreshold: 200,
  corePassiveIncomeMultiplier: 2,
};

export default function LobbyPage() {
  const router = useRouter();
  const { createRoom, listRooms, run, loading, error } = useRoom();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);

  const loadRooms = useCallback(async () => {
    try {
      const data = await listRooms();
      setRooms(data);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "加载房间列表失败");
    }
  }, [listRooms]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleCreate = async () => {
    try {
      const room = await run(() =>
        createRoom({
          name: `房间-${Date.now().toString(36).slice(-4)}`,
          config: defaultConfig,
        })
      );
      message.success("房间已创建");
      router.push(`/room/${room.id}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "创建房间失败");
    }
  };

  const handleJoin = (roomId: string) => {
    router.push(`/room/${roomId}`);
  };

  return (
    <main className="mx-auto max-w-4xl p-6">
      <Space align="center" className="mb-2">
        <Typography.Title level={2} style={{ color: "#d4a853", margin: 0 }}>
          游戏大厅
        </Typography.Title>
        <Tag color="gold">Mock 数据模式</Tag>
      </Space>
      <Typography.Paragraph type="secondary" className="mb-6">
        当前使用内存模拟数据，无需连接 MySQL。
      </Typography.Paragraph>

      <Space className="mb-6" wrap>
        <Button
          type="primary"
          size="large"
          loading={loading}
          onClick={handleCreate}
        >
          创建房间
        </Button>
        <Button size="large" onClick={loadRooms}>
          刷新列表
        </Button>
        <Link href="/login">
          <Button size="large">切换账号</Button>
        </Link>
        <Link href="/prototype/wheel">
          <Button size="large">轮盘原型</Button>
        </Link>
      </Space>

      {error && (
        <Typography.Text type="danger" className="mb-4 block">
          {error}
        </Typography.Text>
      )}

      <Card title="等待中的房间" className="mb-6">
        <List
          dataSource={rooms}
          locale={{ emptyText: "暂无房间，点击「创建房间」开始" }}
          renderItem={(room) => (
            <List.Item
              actions={[
                <Button
                  key="join"
                  type="link"
                  onClick={() => handleJoin(room.id)}
                >
                  加入
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    {room.name}
                    {room.password && <Tag>需密码</Tag>}
                  </Space>
                }
                description={`${room.players?.length ?? 0} 人在线 · ${room.status}`}
              />
            </List.Item>
          )}
        />
      </Card>

      <Card title="快速开始">
        <List
          dataSource={[
            { title: "3–8 人开局", desc: "1 名银行家 + 随机身份" },
            { title: "圈层跃迁", desc: "牛马圈 → 老板圈 → 核心圈" },
            { title: "自动结算", desc: "现金流 / 资产 / 复盘一体化" },
          ]}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta title={item.title} description={item.desc} />
            </List.Item>
          )}
        />
      </Card>
    </main>
  );
}
