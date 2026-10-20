"use client";

import { Button, Card, Empty, Skeleton, Space, Tag, Typography, message } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
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
  const [listing, setListing] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    setListing(true);
    try {
      const data = await listRooms();
      setRooms(data);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "加载房间列表失败");
    } finally {
      setListing(false);
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
    setJoining(roomId);
    router.push(`/room/${roomId}`);
  };

  return (
    <AppShell
      step="lobby"
      title="游戏大厅"
      kicker="选择一桌"
      meta={<Tag color="gold">Mock 数据模式</Tag>}
    >
      <Typography.Paragraph type="secondary" className="!mb-5">
        当前使用内存模拟数据，无需连接 MySQL。
      </Typography.Paragraph>

      <Space className="mb-6" wrap>
        <Button type="primary" size="large" loading={loading} onClick={handleCreate}>
          创建房间
        </Button>
        <Button size="large" loading={listing} onClick={loadRooms}>
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
        {listing && rooms.length === 0 ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : rooms.length === 0 ? (
          <Empty description="还没有房间。创建一个，即可入座。" />
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="ll-row">
              <div>
                <Space wrap>
                  <span>{room.name}</span>
                  {room.password ? <Tag>需密码</Tag> : null}
                  <Tag>{room.status === "playing" ? "对局中" : "等待"}</Tag>
                </Space>
                <Typography.Text type="secondary" className="mt-1 block text-xs">
                  {room.players?.length ?? 0} 人在线
                </Typography.Text>
              </div>
              <Button
                type="primary"
                ghost
                loading={joining === room.id}
                onClick={() => handleJoin(room.id)}
              >
                加入
              </Button>
            </div>
          ))
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { title: "3–8 人开局", desc: "1 名银行家 + 随机身份" },
          { title: "圈层跃迁", desc: "牛马圈 → 老板圈 → 核心圈" },
          { title: "自动结算", desc: "现金流 / 资产 / 复盘一体化" },
        ].map((item) => (
          <Card key={item.title} className="ll-lift" size="small" title={item.title}>
            <Typography.Text type="secondary">{item.desc}</Typography.Text>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
