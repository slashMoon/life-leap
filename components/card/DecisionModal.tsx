"use client";

import { Button, Card, Descriptions, Modal, Space, Tag, Typography } from "antd";
import type { PendingDecision } from "@/types/player";

interface DecisionModalProps {
  pending: PendingDecision | null;
  onAccept: () => void;
  onDecline: () => void;
}

export function DecisionModal({
  pending,
  onAccept,
  onDecline,
}: DecisionModalProps) {
  if (!pending) return null;

  const { preview, tileType, cardName, cardContent, tile } = pending;
  const titleMap: Record<string, string> = {
    study: "进修学习",
    opportunity: "机会卡片",
    investment: "投资项目",
    wealth_leisure: "有钱有闲",
    quality_life: "品质生活",
    market: "市场出价",
  };
  const title = titleMap[tileType] ?? "卡牌决策";

  return (
    <Modal
      open
      title={
        <Space>
          <span>{title}</span>
          <Tag color="gold">{tile.label}</Tag>
        </Space>
      }
      footer={null}
      closable={false}
      maskClosable={false}
      width={480}
    >
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        {cardName}
      </Typography.Title>
      <Typography.Paragraph type="secondary">{cardContent}</Typography.Paragraph>

      <Card size="small" className="mb-4" title="参与后财务变动">
        {preview.cost > 0 || preview.laborIncomeDelta || preview.passiveIncomeDelta || preview.expenseDelta || preview.liabilityDelta ? (
        <Descriptions column={1} size="small">
          {preview.cost > 0 && (
          <Descriptions.Item label="一次性支出">
            <span className="text-red-400">
              -{preview.cost.toLocaleString()} 元
            </span>
          </Descriptions.Item>
          )}
          {preview.laborIncomeDelta != null && (
            <Descriptions.Item label="月薪变化">
              <span className="text-green-400">
                +{preview.laborIncomeDelta.toLocaleString()} 元/月
              </span>
            </Descriptions.Item>
          )}
          {preview.passiveIncomeDelta != null && (
            <Descriptions.Item label="被动收入">
              <span className={preview.passiveIncomeDelta >= 0 ? "text-green-400" : "text-red-400"}>
                {preview.passiveIncomeDelta > 0 ? "+" : ""}
                {preview.passiveIncomeDelta.toLocaleString()} 元/月
              </span>
            </Descriptions.Item>
          )}
          {preview.expenseDelta != null && (
            <Descriptions.Item label="月支出">
              <span className={preview.expenseDelta > 0 ? "text-red-400" : "text-green-400"}>
                {preview.expenseDelta > 0 ? "+" : ""}
                {preview.expenseDelta.toLocaleString()} 元/月
              </span>
            </Descriptions.Item>
          )}
          {preview.liabilityDelta != null && (
            <Descriptions.Item label={preview.liabilityDelta < 0 ? "负债变化" : "新增负债"}>
              <span className={preview.liabilityDelta < 0 ? "text-green-400" : "text-red-400"}>
                {preview.liabilityDelta > 0 ? "+" : ""}
                {preview.liabilityDelta.toLocaleString()} 元
              </span>
            </Descriptions.Item>
          )}
          {preview.assetValueDelta != null && preview.assetValueDelta !== 0 && (
            <Descriptions.Item label="资产市值">
              <span className={preview.assetValueDelta > 0 ? "text-green-400" : "text-red-400"}>
                {preview.assetValueDelta > 0 ? "+" : ""}
                {preview.assetValueDelta.toLocaleString()} 元
              </span>
            </Descriptions.Item>
          )}
        </Descriptions>
        ) : (
          <Typography.Text type="secondary">
            {preview.summary || "此卡无直接财务变动"}
          </Typography.Text>
        )}
        {preview.summary && (preview.assetValueDelta || preview.passiveIncomeDelta) && (
          <Typography.Paragraph type="secondary" className="!mb-0 mt-2 text-xs">
            {preview.summary}
          </Typography.Paragraph>
        )}
        {preview.cost > 0 && !preview.canAfford && (
          <Typography.Text type="danger" className="mt-2 block text-sm">
            现金不足，无法参与（当前现金不足以支付 {preview.cost.toLocaleString()} 元）
          </Typography.Text>
        )}
      </Card>

      <Space className="flex w-full justify-end">
        <Button onClick={onDecline}>{tileType === "market" ? "保留" : "放弃"}</Button>
        <Button
          type="primary"
          onClick={onAccept}
          disabled={preview.cost > 0 && !preview.canAfford}
        >
          {tileType === "market" ? "出售" : "参与"}
        </Button>
      </Space>
    </Modal>
  );
}
