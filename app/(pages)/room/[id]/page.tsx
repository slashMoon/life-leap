"use client";

import { Alert, Button, Result, Spin, Tag, Tooltip, message } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { getStoredUser } from "@/lib/client/user";
import { useRoom } from "@/hooks/useRoom";
import { useSocket } from "@/hooks/useSocket";
import { useRoomStore } from "@/stores/room-store";
import { getIdentity } from "@/lib/constants/identities";
import { isMockMode } from "@/lib/mock/config";
import {
  canSoloPractice,
  canStartRoom,
  getMinBoardPlayers,
  getRoomStartBlockers,
} from "@/lib/room/start-rules";
import { saveSelectedIdentity } from "@/lib/client/identity";
import { IDENTITY_TIER_LABELS, MAX_BOARD_PLAYERS, MAX_ROOM_OCCUPANTS } from "@/types/identity";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  const { userId, nickname } = getStoredUser();
  const {
    name,
    status,
    players,
    bankerUserId,
    enterRoom,
    fetchRoom,
    setPlayerReady,
    startGame,
    setBanker,
    prepareSoloPlay,
    run,
    loading,
  } = useRoom();
  const [booting, setBooting] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const { socket, connected: roomLive } = useSocket(roomId);

  useEffect(() => {
    let cancelled = false;

    useRoomStore.getState().reset();
    setBooting(true);
    setLoadError(null);

    (async () => {
      try {
        await enterRoom(roomId);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "加载房间失败";
          setLoadError(msg);
          message.error(msg);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomId, enterRoom]);

  useEffect(() => {
    if (!socket || booting || loadError) return;
    const refresh = () => {
      void fetchRoom(roomId).catch(() => undefined);
    };
    const join = () => {
      socket.emit("room:join", {
        roomId,
        userId,
        nickname,
        playing: false,
      });
      refresh();
    };
    const onJoined = (player: { userId?: string }) => {
      if (!player.userId || player.userId === userId) return;
      refresh();
    };
    socket.on("connect", join);
    socket.on("room:player-joined", onJoined);
    if (socket.connected) join();
    return () => {
      socket.off("connect", join);
      socket.off("room:player-joined", onJoined);
    };
  }, [socket, booting, loadError, roomId, userId, nickname, fetchRoom]);

  const me = useMemo(
    () => players.find((p) => p.userId === userId || p.nickname === nickname),
    [players, userId, nickname]
  );

  const mockMode = isMockMode();
  const minBoardPlayers = getMinBoardPlayers(mockMode);
  const isBanker = me?.role === "banker" || me?.userId === bankerUserId;
  const boardPlayers = players.filter((p) => p.role !== "banker");
  const startSnapshot = { bankerUserId, players };
  const startBlockers = getRoomStartBlockers(startSnapshot, mockMode);
  const canStart = canStartRoom(startSnapshot, mockMode);
  const showSoloPractice = mockMode && canSoloPractice(startSnapshot) && isBanker;

  const handleReady = async () => {
    setPending("ready");
    try {
      await setPlayerReady(roomId);
      message.success("已准备");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "准备失败");
    } finally {
      setPending(null);
    }
  };

  const handleSoloPractice = async () => {
    try {
      const data = await run(() => prepareSoloPlay(roomId));
      const assigned = data.players.find(
        (p) => p.userId === userId || p.nickname === nickname
      );
      if (assigned?.identityId) {
        saveSelectedIdentity(
          roomId,
          userId,
          assigned.identityId as import("@/types/identity").IdentityId
        );
      }
      message.success(
        assigned?.identityName
          ? `单人试玩就绪：${assigned.identityName}。旅人会在你之后自动掷骰`
          : "单人试玩就绪，旅人会在你之后自动掷骰"
      );
    } catch (e) {
      message.error(e instanceof Error ? e.message : "单人试玩准备失败");
    }
  };

  const handleStart = async () => {
    setPending("start");
    try {
      await startGame(roomId);
      message.success("游戏已开始");
      if (isBanker) {
        message.info("银行家请在场协助结算，玩家将自动进入棋盘");
      } else {
        router.push(`/game/${roomId}`);
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : "开始游戏失败");
    } finally {
      setPending(null);
    }
  };

  const handleBecomeBanker = async () => {
    setPending("banker");
    try {
      await setBanker(roomId);
      message.success("你已担任银行家");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "设置失败");
    } finally {
      setPending(null);
    }
  };

  const statusLabel = (value: string) => {
    if (value === "ready") return "已准备";
    if (value === "playing") return "对局中";
    if (value === "waiting") return "等待";
    return value;
  };

  if (booting) {
    return (
      <AppShell step="room" roomId={roomId} title="加入房间" kicker="房间" width="md">
        <div className="ll-stage-wrap">
          <Spin size="large" tip="正在加入房间…" />
        </div>
      </AppShell>
    );
  }

  if (loadError || !name) {
    return (
      <AppShell step="room" roomId={roomId} title="加入房间失败" kicker="房间" width="md">
        <Result
          status="error"
          title="加入房间失败"
          subTitle={loadError ?? "无法加载房间信息，请返回大厅重试"}
          extra={[
            <Button type="primary" key="lobby" onClick={() => router.push("/lobby")}>
              返回大厅
            </Button>,
          ]}
        />
      </AppShell>
    );
  }

  return (
    <AppShell
      step="room"
      roomId={roomId}
      title={name}
      kicker="房间"
      width="md"
      meta={
        <>
          <Tag color={roomLive ? "success" : "default"}>{roomLive ? "实时" : "未连接"}</Tag>
          <Tag color={status === "playing" ? "processing" : "default"}>{statusLabel(status)}</Tag>
        </>
      }
    >
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message={`${minBoardPlayers === 1 ? "Mock 试玩 1" : "正式局 3"}–${MAX_BOARD_PLAYERS} 名玩家 + 1 名银行家（最多 ${MAX_ROOM_OCCUPANTS} 人）`}
          description={
            mockMode
              ? "创建房间后默认你是银行家。独自试玩请点「单人试玩」；多人局请邀请玩家加入并随机抽身份。"
              : "玩家进入后随机抽取身份；银行家负责结账、发牌与规则裁定。"
          }
        />

        {!bankerUserId && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="尚未指定银行家"
            action={
              <Button size="small" onClick={handleBecomeBanker}>
                我来当银行家
              </Button>
            }
          />
        )}

        <p className="mb-3 text-sm text-[var(--ll-muted)]">
          成员 {players.length}/{MAX_ROOM_OCCUPANTS} · 玩家 {boardPlayers.length}/{minBoardPlayers}–{MAX_BOARD_PLAYERS}
        </p>
        {players.length === 0 ? (
          <p className="ll-hint">等待玩家加入…</p>
        ) : (
          players.map((p) => {
            const mine = p.userId === userId || p.nickname === nickname;
            return (
              <div key={p.userId} className={mine ? "ll-row is-me" : "ll-row"}>
                <div className="flex flex-wrap items-center gap-2">
                  <span>{p.nickname ?? p.userId}</span>
                  {mine ? <Tag color="gold">我</Tag> : null}
                  {p.role === "banker" || p.userId === bankerUserId ? (
                    <Tag color="purple">银行家</Tag>
                  ) : null}
                  {p.bot ? <Tag color="gold">机器人</Tag> : null}
                  {p.identityName ? (
                    <Tag color="blue">{p.identityName}</Tag>
                  ) : p.role !== "banker" ? (
                    <Tag>未选身份</Tag>
                  ) : null}
                </div>
                <Tag color={p.status === "ready" ? "success" : "default"}>{statusLabel(p.status)}</Tag>
              </div>
            );
          })
        )}

        <div className="ll-dock">
          {showSoloPractice && (
            <Button type="primary" onClick={handleSoloPractice} loading={loading}>
              单人试玩
            </Button>
          )}

          {!isBanker && !me?.identityId && (
            <Button
              type="primary"
              onClick={() => router.push(`/room/${roomId}/identity`)}
            >
              随机抽身份
            </Button>
          )}

          {!isBanker && me?.identityId && (
            <Button onClick={() => router.push(`/room/${roomId}/identity`)}>
              重新抽取
            </Button>
          )}

          {!isBanker && (
            <Button type="primary" ghost onClick={handleReady} loading={pending === "ready"}>
              准备
            </Button>
          )}

          {!isBanker && me?.identityId && status === "playing" && (
            <Button type="primary" onClick={() => router.push(`/game/${roomId}`)}>
              进入游戏
            </Button>
          )}

          {isBanker && status === "playing" && (
            <Alert
              type="success"
              showIcon
              message="你是银行家"
              description="请协助玩家结算；如需观战可在聊天区同步进度。"
              className="w-full"
            />
          )}

          {!isBanker && me?.identityId && (
            <Tag>
              {me.identityName} · {IDENTITY_TIER_LABELS[getIdentity(me.identityId).tier]}
              身份
            </Tag>
          )}

          <Button onClick={handleBecomeBanker} disabled={isBanker} loading={pending === "banker"}>
            担任银行家
          </Button>

          <Tooltip title={!canStart ? startBlockers.join("；") : "开始这一局"}>
            <span>
              <Button
                type="primary"
                onClick={handleStart}
                disabled={!canStart}
                loading={pending === "start"}
              >
                开始游戏
              </Button>
            </span>
          </Tooltip>

          <Button onClick={() => router.push("/lobby")}>返回大厅</Button>
        </div>

        {!canStart && startBlockers.length > 0 && (
          <ul className="ll-hint">
            {startBlockers.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
    </AppShell>
  );
}
