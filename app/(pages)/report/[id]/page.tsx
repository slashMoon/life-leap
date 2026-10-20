"use client";

import { Button, Card, Col, Row, Statistic, Typography } from "antd";
import { useParams, useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { AppShell } from "@/components/shell/AppShell";

const mockData = [
  { round: 1, netWorth: 10 },
  { round: 2, netWorth: 25 },
  { round: 3, netWorth: 40 },
  { round: 4, netWorth: 80 },
  { round: 5, netWorth: 120 },
];

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;
  const latest = mockData[mockData.length - 1];

  return (
    <AppShell step="report" roomId={roomId} title="游戏复盘" kicker="复盘" width="lg">
      <Typography.Paragraph type="secondary">
        这一页汇总本局走势。房间 {roomId}
      </Typography.Paragraph>
      <Row gutter={[16, 16]} className="mb-4">
        <Col xs={24} sm={8}>
          <Card className="ll-lift" size="small">
            <Statistic title="记录回合" value={mockData.length} suffix="轮" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="ll-lift" size="small">
            <Statistic title="期末净资产" value={latest.netWorth} suffix="万" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="ll-lift" size="small">
            <Statistic title="起点" value={mockData[0].netWorth} suffix="万" />
          </Card>
        </Col>
      </Row>
      <Card title="净资产变化曲线" className="mb-4">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212,168,83,0.2)" />
            <XAxis dataKey="round" stroke="var(--ll-muted)" />
            <YAxis stroke="var(--ll-muted)" />
            <Tooltip
              contentStyle={{
                background: "rgba(18,15,12,0.94)",
                border: "1px solid rgba(212,168,83,0.4)",
                borderRadius: 12,
                color: "var(--ll-ink)",
              }}
            />
            <Line
              type="monotone"
              dataKey="netWorth"
              stroke="var(--ll-gold)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--ll-gold-bright)" }}
              name="净资产(万)"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
      <div className="ll-dock">
        <Button type="primary" onClick={() => router.push(`/game/${roomId}`)}>
          返回对局
        </Button>
        <Button onClick={() => router.push(`/room/${roomId}`)}>返回房间</Button>
        <Button onClick={() => router.push("/lobby")}>回到大厅</Button>
      </div>
    </AppShell>
  );
}
