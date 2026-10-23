"use client";

import { Button, Card, Empty, Input, InputNumber, Skeleton, Space, Switch, Tag, Typography, message } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { rememberRoomPassword, useRoom, type RoomListItem } from "@/hooks/useRoom";
import type { RoomConfig } from "@/types/game";
import { MAX_BOARD_PLAYERS } from "@/types/identity";

const defaultConfig: RoomConfig = {
  maxPlayers: 6,
  totalRounds: 50,
  difficulty: "normal",
  coreNetWorthThreshold: 200,
  corePassiveIncomeMultiplier: 2,
};

export default function LobbyPage() {
  const router = useRouter();
  const { createRoom, joinRoom, listRooms, run, loading, error } = useRoom();
  const [rooms, setRooms] = useState<RoomListItem[]>([]);
  const [listing, setListing] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(defaultConfig.maxPlayers);
  const [isPublic, setIsPublic] = useState(true);
  const [fillBots, setFillBots] = useState(true);
  const [password, setPassword] = useState("");
  const [lockId, setLockId] = useState<string | null>(null);
  const [lockPassword, setLockPassword] = useState("");
  const [lockError, setLockError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codePassword, setCodePassword] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  const loadRooms = useCallback(async () => {
    setListing(true);
    try {
      setRooms(await listRooms());
    } catch (e) {
      message.error(e instanceof Error ? e.message : "加载房间列表失败");
    } finally {
      setListing(false);
    }
  }, [listRooms]);

  useEffect(() => {
    void loadRooms();
  }, [loadRooms]);

  const handleCreate = async () => {
    try {
      const room = await run(() =>
        createRoom({
          name: `房间-${Date.now().toString(36).slice(-4)}`,
          password: password.trim() || undefined,
          isPublic,
          fillBots,
          config: { ...defaultConfig, maxPlayers },
        })
      );
      if (password.trim()) rememberRoomPassword(room.id, password.trim());
      message.success(room.code ? `房间已创建 · ${room.code}` : "房间已创建");
      router.push(`/room/${room.id}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "创建房间失败");
    }
  };

  const enterListedRoom = async (room: RoomListItem, secret?: string) => {
    if (room.hasPassword && !secret) {
      setLockId(room.id);
      setLockPassword("");
      setLockError(null);
      return;
    }
    setJoining(room.id);
    setLockError(null);
    try {
      if (secret) rememberRoomPassword(room.id, secret);
      await joinRoom(room.id, secret);
      router.push(`/room/${room.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "加入失败";
      setLockError(msg);
      message.error(msg);
      setJoining(null);
    }
  };

  const handleCode = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      message.warning("请输入房间号");
      return;
    }
    setLookingUp(true);
    setCodeError(null);
    try {
      const found = await fetch(`/api/room?code=${encodeURIComponent(trimmed)}`).then(async (res) => {
        const data = (await res.json()) as { id?: string; hasPassword?: boolean; error?: string };
        if (!res.ok) throw new Error(data.error || "没有这个房间号");
        return data;
      });
      if (!found.id) throw new Error("没有这个房间号");
      if (found.hasPassword && !codePassword.trim()) {
        message.warning("这个房间需要密码");
        return;
      }
      if (codePassword.trim()) rememberRoomPassword(found.id, codePassword.trim());
      await joinRoom(found.id, codePassword.trim() || undefined);
      router.push(`/room/${found.id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "进房失败";
      setCodeError(msg);
      message.error(msg);
    } finally {
      setLookingUp(false);
    }
  };

  return (
    <AppShell
      step="lobby"
      title="游戏大厅"
      kicker="选择模式"
      meta={<Tag color="gold">Mock 数据模式</Tag>}
    >
      <div className="ll-mode-grid">
        <article className="ll-mode-card is-solo">
          <div className="ll-mode-kicker">SOLO</div>
          <h2>单机模式</h2>
          <p>系统当银行家。你和若干机器人同桌，一键开局，不用密码，也不用等人。</p>
          <Link href="/solo">
            <Button type="primary" size="large">
              进入单机
            </Button>
          </Link>
        </article>
        <article className="ll-mode-card" id="multi">
          <div className="ll-mode-kicker">MULTI</div>
          <h2>多人模式</h2>
          <p>创建或加入房间，真人落座。人不够时可用机器人补位，房主再开始。</p>
          <Button size="large" href="#multi-rooms">
            去房间列表
          </Button>
        </article>
      </div>

      <Card title="创建多人房间" className="mb-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--ll-muted)]">人数上限</span>
            <InputNumber
              min={2}
              max={MAX_BOARD_PLAYERS}
              value={maxPlayers}
              onChange={(value) => setMaxPlayers(value ?? 2)}
              size="large"
              className="!w-full"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--ll-muted)]">房间密码（可留空）</span>
            <Input.Password
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="不设密码则可直接加入"
              size="large"
              maxLength={16}
            />
          </label>
        </div>
        <Space className="mt-4" wrap>
          <span className="text-sm text-[var(--ll-muted)]">公开房间</span>
          <Switch checked={isPublic} onChange={setIsPublic} />
          <span className="text-sm text-[var(--ll-muted)]">用机器人补位</span>
          <Switch checked={fillBots} onChange={setFillBots} />
        </Space>
        <div className="mt-4">
          <Button type="primary" size="large" loading={loading} onClick={() => void handleCreate()}>
            创建房间
          </Button>
        </div>
      </Card>

      {error ? (
        <Typography.Text type="danger" className="mb-4 block">
          {error}
        </Typography.Text>
      ) : null}

      <Card
        id="multi-rooms"
        title="多人房间"
        className="mb-6"
        extra={
          <Button size="small" loading={listing} onClick={() => void loadRooms()}>
            刷新
          </Button>
        }
      >
        {listing && rooms.length === 0 ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : rooms.length === 0 ? (
          <Empty description="还没有公开房间。创建一个，或用房间号进入私密局。" />
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="ll-row">
              <div>
                <Space wrap>
                  <span>{room.name}</span>
                  <Tag color="gold">{room.code}</Tag>
                  {room.hasPassword ? <Tag>需密码</Tag> : null}
                  {room.fillBots ? <Tag>可补位</Tag> : null}
                  <Tag>{room.status === "playing" ? "对局中" : "等待"}</Tag>
                </Space>
                <Typography.Text type="secondary" className="mt-1 block text-xs">
                  {room.players?.filter((player) => !player.bot).length ?? 0} 人在座
                </Typography.Text>
                {lockId === room.id ? (
                  <Space className="mt-2" wrap>
                    <Input.Password
                      value={lockPassword}
                      placeholder="房间密码"
                      onChange={(event) => setLockPassword(event.target.value)}
                      onPressEnter={() => void enterListedRoom(room, lockPassword.trim())}
                    />
                    <Button
                      type="primary"
                      loading={joining === room.id}
                      onClick={() => void enterListedRoom(room, lockPassword.trim())}
                    >
                      确认进入
                    </Button>
                    {lockError ? (
                      <Typography.Text type="danger">{lockError}</Typography.Text>
                    ) : null}
                  </Space>
                ) : null}
              </div>
              {lockId === room.id ? null : (
                <Button
                  type="primary"
                  ghost
                  loading={joining === room.id}
                  onClick={() => void enterListedRoom(room)}
                >
                  加入
                </Button>
              )}
            </div>
          ))
        )}
      </Card>

      <Card title="用房间号进入" className="mb-6">
        <Space wrap className="w-full">
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="房间号"
            maxLength={8}
            size="large"
            className="!w-36"
          />
          <Input.Password
            value={codePassword}
            onChange={(event) => setCodePassword(event.target.value)}
            placeholder="密码，没有就留空"
            size="large"
            className="!w-52"
            onPressEnter={() => void handleCode()}
          />
          <Button type="primary" size="large" loading={lookingUp} onClick={() => void handleCode()}>
            进入
          </Button>
        </Space>
        {codeError ? (
          <Typography.Text type="danger" className="mt-3 block">
            {codeError}
          </Typography.Text>
        ) : null}
      </Card>

      <Space wrap>
        <Link href="/login">
          <Button>切换账号</Button>
        </Link>
        <Link href="/prototype/wheel">
          <Button>轮盘原型</Button>
        </Link>
      </Space>
    </AppShell>
  );
}
