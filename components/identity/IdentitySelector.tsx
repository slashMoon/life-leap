"use client";

import { Button, Card, Col, Row, Space, Tag, Typography } from "antd";
import type { GameIdentity } from "@/types/identity";
import { IDENTITY_TIER_LABELS } from "@/types/identity";
import { sumNativeLiabilities } from "@/lib/constants/identities";

/** 身份池展示（只读，供随机抽取参考） */
export function IdentityPool({ identities }: { identities: GameIdentity[] }) {
  const tiers = [
    { key: "high" as const, label: IDENTITY_TIER_LABELS.high },
    { key: "middle" as const, label: IDENTITY_TIER_LABELS.middle },
    { key: "low" as const, label: IDENTITY_TIER_LABELS.low },
  ];

  return (
    <div className="space-y-8">
      {tiers.map(({ key, label }) => {
        const list = identities.filter((i) => i.tier === key);
        if (!list.length) return null;
        return (
          <section key={key}>
            <Typography.Title level={5} className="!mb-3 !text-gold">
              {label}身份
            </Typography.Title>
            <Row gutter={[16, 16]}>
              {list.map((identity) => {
                const debt = sumNativeLiabilities(identity.nativeLiabilities);
                return (
                  <Col xs={24} sm={12} lg={8} key={identity.id}>
                    <Card className="h-full opacity-90">
                      <Space direction="vertical" size="small" className="w-full">
                        <Space wrap>
                          <Tag color="gold">#{identity.order}</Tag>
                          <Typography.Text strong>{identity.name}</Typography.Text>
                        </Space>
                        <Typography.Text type="secondary" className="text-xs">
                          月薪 {identity.salary.toLocaleString()} · 月支出{" "}
                          {identity.totalExpense.toLocaleString()} · 流动现金{" "}
                          {identity.liquidCash.toLocaleString()}
                        </Typography.Text>
                        <Typography.Text type="secondary" className="text-xs">
                          银行储蓄 {identity.bankSavings.toLocaleString()} · 原生负债{" "}
                          {debt.toLocaleString()}
                        </Typography.Text>
                      </Space>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </section>
        );
      })}
    </div>
  );
}

interface RandomIdentityResultProps {
  identity: GameIdentity;
  loading?: boolean;
  onRedraw?: () => void;
  onConfirm: () => void;
}

export function RandomIdentityResult({
  identity,
  loading,
  onRedraw,
  onConfirm,
}: RandomIdentityResultProps) {
  const debt = sumNativeLiabilities(identity.nativeLiabilities);
  return (
    <Card className="sticky bottom-4 mt-6 border-gold/30 bg-[#141b2dcc] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Typography.Text className="text-gold text-lg">
            抽中：{identity.name}
          </Typography.Text>
          <Typography.Paragraph type="secondary" className="!mb-0 text-sm">
            {IDENTITY_TIER_LABELS[identity.tier]} · 月薪{" "}
            {identity.salary.toLocaleString()} · 开局现金约{" "}
            {(identity.bankSavings + identity.liquidCash).toLocaleString()} 元
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary" className="!mb-0 text-xs">
            原生负债 {debt.toLocaleString()} 元 · 月现金流{" "}
            {identity.liquidCash.toLocaleString()} 元
          </Typography.Paragraph>
        </div>
        <Space>
          {onRedraw && (
            <Button size="large" loading={loading} onClick={onRedraw}>
              重新抽取
            </Button>
          )}
          <Button type="primary" size="large" loading={loading} onClick={onConfirm}>
            确认身份
          </Button>
        </Space>
      </div>
    </Card>
  );
}

interface RandomIdentityDrawProps {
  loading?: boolean;
  onDraw: () => void;
}

export function RandomIdentityDraw({ loading, onDraw }: RandomIdentityDrawProps) {
  return (
    <Card className="mb-8 border-gold/20 bg-[#141b2d]/60 text-center">
      <Typography.Paragraph type="secondary" className="!mb-4">
        系统将从身份池中随机分配开局职业，身份可复用（多名玩家可能抽到相同身份）
      </Typography.Paragraph>
      <Button type="primary" size="large" loading={loading} onClick={onDraw}>
        随机抽取身份
      </Button>
    </Card>
  );
}
