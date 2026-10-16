"use client";

import { Card as AntCard, Empty } from "antd";

interface CardDrawerProps {
  cardName?: string;
  cardContent?: string;
  visible?: boolean;
}

export function CardDrawer({
  cardName,
  cardContent,
  visible = false,
}: CardDrawerProps) {
  if (!visible) return null;

  return (
    <AntCard title={cardName ?? "抽卡"} className="mt-4">
      {cardContent ? (
        <p>{cardContent}</p>
      ) : (
        <Empty description="等待抽卡…" />
      )}
    </AntCard>
  );
}
