"use client";

import { Alert, Button, Spin, Typography, message } from "antd";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import {
  IdentityPool,
  RandomIdentityDraw,
  RandomIdentityResult,
} from "@/components/identity/IdentitySelector";
import { saveSelectedIdentity } from "@/lib/client/identity";
import { getStoredUser } from "@/lib/client/user";
import { GAME_IDENTITIES, getIdentity } from "@/lib/constants/identities";
import { useRoom } from "@/hooks/useRoom";
import type { IdentityId } from "@/types/identity";

export default function IdentitySelectPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  const { userId, nickname } = getStoredUser();
  const { players, enterRoom, assignRandomIdentity, loading, run } = useRoom();
  const [booting, setBooting] = useState(true);
  const [drawnId, setDrawnId] = useState<IdentityId | undefined>();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    enterRoom(roomId)
      .catch(() => message.error("加载房间失败"))
      .finally(() => setBooting(false));
  }, [roomId, enterRoom]);

  const me = players.find(
    (p) => p.userId === userId || p.nickname === nickname
  );

  useEffect(() => {
    if (me?.identityId) setDrawnId(me.identityId as IdentityId);
  }, [me?.identityId]);

  const handleDraw = async () => {
    try {
      const data = await run(() => assignRandomIdentity(roomId));
      const id = data.assignedIdentityId ?? me?.identityId;
      if (!id) {
        message.error("抽取失败，请重试");
        return;
      }
      setDrawnId(id);
      message.success(`抽中：${getIdentity(id).name}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "随机抽取失败");
    }
  };

  const handleConfirm = async () => {
    if (!drawnId) {
      message.warning("请先随机抽取身份");
      return;
    }
    setConfirming(true);
    saveSelectedIdentity(roomId, userId, drawnId);
    message.success(`身份已确认：${getIdentity(drawnId).name}`);
    router.push(`/room/${roomId}`);
  };

  if (booting) {
    return (
      <AppShell step="identity" roomId={roomId} title="随机身份" kicker="身份" width="lg">
        <div className="ll-stage-wrap">
          <Spin size="large" tip="加载中…" />
        </div>
      </AppShell>
    );
  }

  if (me?.role === "banker") {
    return (
      <AppShell step="identity" roomId={roomId} title="银行家无需抽身份" kicker="身份" width="md">
        <Alert
          type="info"
          showIcon
          message="你是本局银行家"
          description="银行家负责结算与发牌，无需抽取游戏身份。"
          className="mb-4"
        />
        <Button type="primary" onClick={() => router.push(`/room/${roomId}`)}>
          返回房间
        </Button>
      </AppShell>
    );
  }

  const drawnIdentity = drawnId ? getIdentity(drawnId) : undefined;

  return (
    <AppShell
      step="identity"
      roomId={roomId}
      title="随机身份"
      kicker="身份"
      width="lg"
      meta={<Typography.Text type="secondary">身份可复用</Typography.Text>}
    >
      {!drawnIdentity ? (
        <RandomIdentityDraw loading={loading} onDraw={handleDraw} />
      ) : (
        <RandomIdentityResult
          identity={drawnIdentity}
          loading={loading || confirming}
          onRedraw={handleDraw}
          onConfirm={handleConfirm}
        />
      )}

      <Typography.Title level={5} className="!mt-8 !text-[var(--ll-muted)]">
        身份池参考
      </Typography.Title>
      <IdentityPool identities={GAME_IDENTITIES} activeId={drawnId} />
    </AppShell>
  );
}
