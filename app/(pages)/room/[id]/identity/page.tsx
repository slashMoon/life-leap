"use client";

import { Alert, Button, Spin, Typography, message } from "antd";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
    saveSelectedIdentity(roomId, userId, drawnId);
    message.success(`身份已确认：${getIdentity(drawnId).name}`);
    router.push(`/room/${roomId}`);
  };

  if (booting) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <Spin size="large" tip="加载中…" />
      </main>
    );
  }

  if (me?.role === "banker") {
    return (
      <main className="mx-auto max-w-lg p-6">
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
      </main>
    );
  }

  const drawnIdentity = drawnId ? getIdentity(drawnId) : undefined;

  return (
    <main className="mx-auto max-w-5xl p-6 pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Typography.Title level={3} style={{ color: "#d4a853", margin: 0 }}>
            随机身份
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="!mb-0">
            从身份池中随机分配开局职业 · 身份可复用
          </Typography.Paragraph>
        </div>
        <Link href={`/room/${roomId}`}>返回房间</Link>
      </div>

      {!drawnIdentity ? (
        <RandomIdentityDraw loading={loading} onDraw={handleDraw} />
      ) : (
        <RandomIdentityResult
          identity={drawnIdentity}
          loading={loading}
          onRedraw={handleDraw}
          onConfirm={handleConfirm}
        />
      )}

      <Typography.Title level={5} className="!mt-8 !text-gray-400">
        身份池参考
      </Typography.Title>
      <IdentityPool identities={GAME_IDENTITIES} />
    </main>
  );
}
