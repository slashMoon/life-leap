"use client";

import { Alert, Button, Input, Result, Spin, Tag, Tooltip, message } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { getStoredUser } from "@/lib/client/user";
import { rememberRoomPassword, useRoom, type RoomDetail } from "@/hooks/useRoom";
import { useSocket } from "@/hooks/useSocket";
import { useRoomStore } from "@/stores/room-store";
import { getIdentity } from "@/lib/constants/identities";
import { SYSTEM_BANKER_USER_ID } from "@/lib/mock/bots";
import { canStartRoom, getRoomStartBlockers, isRoomHost } from "@/lib/room/start-rules";
import { IDENTITY_TIER_LABELS, MAX_BOARD_PLAYERS } from "@/types/identity";

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  const { userId, nickname } = getStoredUser();
  const {
    name,
    status,
    config,
    players,
    hostUserId,
    bankerUserId,
    enterRoom,
    fetchRoom,
    setPlayerReady,
    startGame,
    setBanker,
  } = useRoom();
  const [booting, setBooting] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [needPassword, setNeedPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [meta, setMeta] = useState<Pick<RoomDetail, "mode" | "code" | "fillBots" | "isPublic"> | null>(null);
  const { socket, connected: roomLive } = useSocket(roomId);

  const applyDetail = (data: RoomDetail) => {
    setMeta({
      mode: data.mode,
      code: data.code,
      fillBots: data.fillBots,
      isPublic: data.isPublic,
    });
  };

  useEffect(() => {
    let cancelled = false;

    useRoomStore.getState().reset();
    setBooting(true);
    setLoadError(null);
    setNeedPassword(false);

    (async () => {
      try {
        const data = await enterRoom(roomId);
        if (!cancelled) applyDetail(data);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : "加载房间失败";
          if (msg.includes("密码")) {
            setNeedPassword(true);
          } else {
            setLoadError(msg);
            message.error(msg);
          }
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
    if (!socket || booting || loadError || needPassword) return;
    const refresh = () => {
      void fetchRoom(roomId)
        .then((data) => applyDetail(data))
        .catch(() => undefined);
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
  }, [socket, booting, loadError, needPassword, roomId, userId, nickname, fetchRoom]);

  const me = useMemo(
    () => players.find((player) => player.userId === userId || player.nickname === nickname),
    [players, userId, nickname]
  );

  const host = isRoomHost({ hostUserId, players }, userId, nickname);
  const isBanker = me?.role === "banker" || (!!me && me.userId === bankerUserId);
  const systemBanker = bankerUserId === SYSTEM_BANKER_USER_ID;
  const boardPlayers = players.filter((player) => player.role !== "banker");
  const boardHumans = boardPlayers.filter((player) => !player.bot);
  const startSnapshot = {
    mode: meta?.mode ?? "multi",
    fillBots: meta?.fillBots,
    maxPlayers: config?.maxPlayers,
    hostUserId,
    bankerUserId,
    players,
  };
  const startBlockers = getRoomStartBlockers(startSnapshot);
  const canStart = host && canStartRoom(startSnapshot);

  const submitPassword = async () => {
    const secret = password.trim();
    if (!secret) {
      setPasswordError("请输入房间密码");
      return;
    }
    setPending("password");
    setPasswordError(null);
    try {
      rememberRoomPassword(roomId, secret);
      const data = await enterRoom(roomId, secret);
      applyDetail(data);
      setNeedPassword(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "密码不正确";
      setPasswordError(msg);
      message.error(msg);
    } finally {
      setPending(null);
    }
  };

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

  const handleStart = async () => {
    setPending("start");
    try {
      await startGame(roomId);
      message.success("游戏已开始");
      if (isBanker) {
        message.info("你担任银行家，不掷骰也不走路");
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
      message.success("你已担任银行家，本局不掷骰");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "设置失败");
    } finally {
      setPending(null);
    }
  };

  const statusLabel = (value: string) => {
    if (value === "ready") return "已准备";
    if (value === "playing") return "对局中";
    if (value === "waiting") return "未准备";
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

  if (needPassword) {
    return (
      <AppShell step="room" roomId={roomId} title="房间密码" kicker="多人" width="md">
        <div className="ll-stage-wrap">
          <div className="ll-mode-card w-full max-w-md">
            <div className="ll-mode-kicker">LOCKED</div>
            <h2>这间房上了锁</h2>
            <p>密码只在进房时核对，不会回传给其他玩家。</p>
            <Input.Password
              size="large"
              value={password}
              placeholder="房间密码"
              status={passwordError ? "error" : undefined}
              onChange={(event) => setPassword(event.target.value)}
              onPressEnter={() => void submitPassword()}
            />
            {passwordError ? (
              <p className="mt-2 text-sm text-[var(--ll-danger)]">{passwordError}</p>
            ) : null}
            <div className="mt-4 flex gap-2">
              <Button type="primary" loading={pending === "password"} onClick={() => void submitPassword()}>
                进入
              </Button>
              <Button onClick={() => router.push("/lobby")}>返回大厅</Button>
            </div>
          </div>
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

  const modeLabel = meta?.mode === "solo" ? "单机" : `多人 · ${meta?.code ?? ""}`.trim();

  return (
    <AppShell
      step="room"
      roomId={roomId}
      title={name}
      kicker={meta?.mode === "solo" ? "单机" : "多人"}
      width="md"
      meta={
        <>
          <Tag color="gold">{modeLabel}</Tag>
          <Tag color={roomLive ? "success" : "default"}>{roomLive ? "实时" : "未连接"}</Tag>
          <Tag color={status === "playing" ? "processing" : "default"}>{statusLabel(status)}</Tag>
        </>
      }
    >
      <Alert
        type="info"
        showIcon
        className="mb-4"
        message={
          systemBanker
            ? "系统担任银行家。有人点「担任银行家」后，由该真人主持，不再掷骰。"
            : "真人银行家不掷骰、不走路，负责结账和裁定。"
        }
        description={
          meta?.fillBots
            ? `人数上限 ${config?.maxPlayers ?? MAX_BOARD_PLAYERS}。不足 2 名真人时，开始会用机器人补到至少 2 名棋盘玩家。`
            : "未开启机器人补位，至少需要 2 名真人才能开始。"
        }
      />

      {!bankerUserId && (
        <Alert
          type="warning"
          showIcon
          className="mb-4"
          message="尚未指定银行家"
          action={
            <Button size="small" onClick={() => void handleBecomeBanker()}>
              我来当银行家
            </Button>
          }
        />
      )}

      <p className="mb-3 text-sm text-[var(--ll-muted)]">
        棋盘玩家 {boardPlayers.length} · 真人 {boardHumans.length}
        {meta?.fillBots && boardHumans.length === 1 ? " · 开始时补 1 名机器人" : ""}
      </p>
      {players.length === 0 ? (
        <p className="ll-hint">等待玩家加入…</p>
      ) : (
        players.map((player) => {
          const mine = player.userId === userId || player.nickname === nickname;
          const isHostSeat = player.userId === hostUserId;
          return (
            <div key={player.userId} className={mine ? "ll-row is-me" : "ll-row"}>
              <div className="flex flex-wrap items-center gap-2">
                <span>{player.nickname ?? player.userId}</span>
                {mine ? <Tag color="gold">我</Tag> : null}
                {isHostSeat ? <Tag color="gold">房主</Tag> : null}
                {player.role === "banker" || player.userId === bankerUserId ? (
                  <Tag color="purple">银行家</Tag>
                ) : null}
                {player.bot ? <Tag>机器人</Tag> : null}
                {player.identityName ? (
                  <Tag color="blue">{player.identityName}</Tag>
                ) : player.role !== "banker" ? (
                  <Tag>未选身份</Tag>
                ) : null}
              </div>
              <Tag color={player.status === "ready" || player.status === "playing" ? "success" : "default"}>
                {statusLabel(player.status)}
              </Tag>
            </div>
          );
        })
      )}

      <div className="ll-dock">
        {!isBanker && !me?.identityId && (
          <Button type="primary" onClick={() => router.push(`/room/${roomId}/identity`)}>
            随机抽身份
          </Button>
        )}

        {!isBanker && me?.identityId && status !== "playing" && (
          <Button onClick={() => router.push(`/room/${roomId}/identity`)}>重新抽取</Button>
        )}

        {!isBanker && status !== "playing" && (
          <Button type="primary" ghost onClick={() => void handleReady()} loading={pending === "ready"}>
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
            description="本局你不掷骰、不走路，请协助玩家结算。"
            className="w-full"
          />
        )}

        {!isBanker && me?.identityId && (
          <Tag>
            {me.identityName} · {IDENTITY_TIER_LABELS[getIdentity(me.identityId).tier]}
            身份
          </Tag>
        )}

        {status !== "playing" && (
          <Button onClick={() => void handleBecomeBanker()} disabled={isBanker} loading={pending === "banker"}>
            担任银行家
          </Button>
        )}

        <Tooltip
          title={
            !host
              ? "只有房主可以开始"
              : !canStart
                ? startBlockers.join("；")
                : "开始这一局"
          }
        >
          <span>
            <Button
              type="primary"
              onClick={() => void handleStart()}
              disabled={!canStart || status === "playing"}
              loading={pending === "start"}
            >
              {host ? "开始游戏" : "等待房主开始"}
            </Button>
          </span>
        </Tooltip>

        <Button onClick={() => router.push("/lobby")}>返回大厅</Button>
      </div>

      {host && !canStart && startBlockers.length > 0 && (
        <ul className="ll-hint">
          {startBlockers.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
