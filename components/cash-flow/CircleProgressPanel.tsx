"use client";

import { Card, Descriptions, Progress, Tag, Typography } from "antd";
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
      <Progress
        percent={progress.items.length ? Math.round((metCount / progress.items.length) * 100) : 0}
        showInfo={false}
        trailColor="rgba(255,255,255,0.08)"
        className="!mb-3"
      />
      <Typography.Paragraph type="secondary" className="!mb-3 text-xs">
        {progress.ruleTitle}
      </Typography.Paragraph>
      <Descriptions column={1} size="small">
        {progress.items.map((item) => (
          <Descriptions.Item
            key={item.label}
            label={
              <span className={item.met ? "ll-up" : ""}>
                {item.label}
              </span>
            }
          >
            <span className={item.met ? "ll-up" : "text-[var(--ll-ink)]"}>
              {item.current}
              <span className="text-[var(--ll-muted)]"> / 目标 {item.required}</span>
              {item.met && " ✓"}
            </span>
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Card>
  );
}

/** MeChip 旁的四段微进度，高度交给父级压在一行里。 */
export function CircleMicro({
  player,
}: {
  player: CircleProgressPanelProps["player"];
}) {
  const progress = getCircleTransitionProgress(buildTransitionContext(player));
  if (!progress) {
    return <span className="ll-micro-label">已达核心圈</span>;
  }
  const met = progress.items.filter((item) => item.met).length;
  const filled = progress.items.length
    ? Math.round((met / progress.items.length) * 4)
    : 0;
  return (
    <span className="ll-micro" title={`${player.circle} → ${progress.target}`}>
      <span className="ll-micro-label">
        {player.circle} → {progress.target}
      </span>
      <span className="ll-micro-pips" aria-hidden>
        {Array.from({ length: 4 }, (_, index) => (
          <i key={index} className={index < filled ? "is-on" : ""} />
        ))}
      </span>
      <span className="ll-sr">
        {progress.ruleTitle} {met}/{progress.items.length}
      </span>
    </span>
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
