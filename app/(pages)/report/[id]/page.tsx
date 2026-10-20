"use client";

import { Card, Typography } from "antd";
import { useParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const mockData = [
  { round: 1, netWorth: 10 },
  { round: 2, netWorth: 25 },
  { round: 3, netWorth: 40 },
  { round: 4, netWorth: 80 },
  { round: 5, netWorth: 120 },
];

export default function ReportPage() {
  const params = useParams();
  const roomId = params.id as string;

  return (
    <main className="ll-page ll-page-lg">
      <Typography.Title level={2} className="ll-title">
        游戏复盘
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        房间 ID：{roomId}
      </Typography.Paragraph>
      <Card title="净资产变化曲线">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--ll-line)" />
            <XAxis dataKey="round" stroke="var(--ll-muted)" />
            <YAxis stroke="var(--ll-muted)" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="netWorth"
              stroke="var(--ll-gold)"
              name="净资产(万)"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </main>
  );
}
