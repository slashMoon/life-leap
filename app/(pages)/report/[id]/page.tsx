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
    <main className="mx-auto max-w-4xl p-6">
      <Typography.Title level={2} style={{ color: "#d4a853" }}>
        游戏复盘
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        房间 ID：{roomId}
      </Typography.Paragraph>
      <Card title="净资产变化曲线">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={mockData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey="round" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="netWorth"
              stroke="#d4a853"
              name="净资产(万)"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </main>
  );
}
