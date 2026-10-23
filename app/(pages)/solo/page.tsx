"use client";

import { Button, Card, Select, Slider, Typography, message } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/shell/AppShell";
import { useRoom } from "@/hooks/useRoom";
import { saveSelectedIdentity } from "@/lib/client/identity";
import { getStoredUser } from "@/lib/client/user";
import { DEFAULT_SOLO_BOTS, MAX_SOLO_BOTS, MIN_SOLO_BOTS } from "@/lib/mock/bots";
import type { RoomConfig } from "@/types/game";

export default function SoloPage() {
  const router = useRouter();
  const { startSolo } = useRoom();
  const [bots, setBots] = useState(DEFAULT_SOLO_BOTS);
  const [difficulty, setDifficulty] = useState<RoomConfig["difficulty"]>("normal");
  const [starting, setStarting] = useState(false);
  const seats = 1 + bots;

  const handleStart = async () => {
    setStarting(true);
    try {
      const room = await startSolo({ botCount: bots, difficulty });
      const { userId } = getStoredUser();
      const me = room.players.find((player) => player.userId === userId || player.nickname === userId);
      if (me?.identityId) saveSelectedIdentity(room.id, userId, me.identityId);
      message.success("单机开局，系统银行家已就位");
      router.push(`/game/${room.id}`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "单机开局失败");
      setStarting(false);
    }
  };

  return (
    <AppShell step="lobby" title="单机模式" kicker="一人一桌" width="md">
      <Card className="ll-mode-card is-solo" bordered={false}>
        <div className="ll-mode-kicker">SOLO</div>
        <Typography.Paragraph className="!mb-4 !text-[var(--ll-muted)]">
          不用建房、不用等人。系统担任银行家，棋盘上是你和 {bots} 名机器人。他们会自己掷骰，现金够就参与。
        </Typography.Paragraph>
        <Typography.Text>机器人数量 · {bots}</Typography.Text>
        <Slider
          min={MIN_SOLO_BOTS}
          max={MAX_SOLO_BOTS}
          value={bots}
          onChange={setBots}
          marks={{ 1: "1", 2: "2", 4: "4", 7: "7" }}
          tooltip={{ formatter: (value) => `${value} 名` }}
        />
        <Typography.Paragraph type="secondary" className="!mb-4">
          棋盘玩家 {seats} 人（含你），另有系统银行家。
        </Typography.Paragraph>
        <Typography.Text className="mb-2 block">难度</Typography.Text>
        <Select
          className="mb-5 w-full"
          size="large"
          value={difficulty}
          onChange={setDifficulty}
          options={[
            { value: "easy", label: "从容" },
            { value: "normal", label: "标准" },
            { value: "hard", label: "紧绷" },
          ]}
        />
        <Typography.Paragraph type="secondary" className="!mb-4">
          机器人沿用同一套决策：现金够就参与，不够就放弃。
        </Typography.Paragraph>
        <Button type="primary" size="large" block loading={starting} onClick={() => void handleStart()}>
          开始单机
        </Button>
        <Button className="mt-3" block onClick={() => router.push("/lobby")}>
          返回大厅
        </Button>
      </Card>
    </AppShell>
  );
}
