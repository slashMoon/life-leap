"use client";

import { Card, Descriptions, Tag, Typography } from "antd";
import {
  buildTransitionContext,
  getCircleTransitionProgress,
} from "@/lib/rule-engine/circle-transition";
import type { LifeCircle } from "@/types/game";
import type { PlayerRuntimeState } from "@/types/player";

interface CircleProgressPanelProps {
  player: Pick<
    PlayerRuntimeState,
    | "circle"
    | "cashFlow"
    | "cash"
    | "coreNetWorthThreshold"
    | "corePassiveIncomeMultiplier"
  >;
}

export function CircleProgressPanel({ player }: CircleProgressPanelProps) {
  const progress = getCircleTransitionProgress(buildTransitionContext(player));

  if (!progress) {
    return (
      <Card title="圈层目标" size="small" className="mt-4">
        <Typography.Text type="success">已达核心圈</Typography.Text>
      </Card>
    );
  }

  const metCount = progress.items.filter((i) => i.met).length;

  return (
    <Card
      title={`跃迁进度 · ${player.circle} → ${progress.target}`}
      size="small"
      className="mt-4"
      extra={
        <Tag color={metCount === progress.items.length ? "success" : "gold"}>
          {metCount}/{progress.items.length}
        </Tag>
      }
    >
      <Typography.Paragraph type="secondary" className="!mb-3 text-xs">
        {progress.ruleTitle}
      </Typography.Paragraph>
      <Descriptions column={1} size="small">
        {progress.items.map((item) => (
          <Descriptions.Item
            key={item.label}
            label={
              <span className={item.met ? "text-green-400" : ""}>
                {item.label}
              </span>
            }
          >
            <span className={item.met ? "text-green-400" : "text-gray-300"}>
              {item.current}
              <span className="text-gray-500"> / 目标 {item.required}</span>
              {item.met && " ✓"}
            </span>
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Card>
  );
}

export function circleLabel(circle: LifeCircle) {
  const map: Record<LifeCircle, string> = {
    牛马: "牛马圈（外圈）",
    老板: "老板圈（内圈）",
    核心: "核心圈（内圈）",
  };
  return map[circle];
}
