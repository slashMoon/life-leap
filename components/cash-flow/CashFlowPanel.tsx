"use client";

import { Card, Descriptions, Statistic } from "antd";
import type { CashFlowSnapshot, LifeCircle } from "@/types/game";
import type { NativeLiabilities } from "@/types/identity";

interface CashFlowPanelProps {
  cashFlow?: CashFlowSnapshot | null;
  circle?: LifeCircle;
  cash?: number;
  nativeLiabilities?: NativeLiabilities;
  bankLoan?: number;
  creditCardDebt?: number;
  timePoints?: number;
  qualityLifePoints?: number;
}

export function CashFlowPanel({
  cashFlow,
  circle = "牛马",
  cash,
  nativeLiabilities,
  bankLoan = 0,
  creditCardDebt = 0,
  timePoints = 0,
  qualityLifePoints = 0,
}: CashFlowPanelProps) {
  const data = cashFlow ?? {
    laborIncome: 15000,
    passiveIncome: 0,
    totalExpense: 8000,
    cashFlow: 7000,
    netWorth: 50000,
    totalAssets: 50000,
    totalLiabilities: 0,
  };

  return (
    <Card title={`现金流 · ${circle}圈`}>
      <Statistic
        title="月现金流"
        value={data.cashFlow}
        precision={0}
        valueStyle={{
          color: data.cashFlow >= 0 ? "#52c41a" : "#ff4d4f",
        }}
      />
      <Descriptions column={1} size="small" className="mt-4">
        <Descriptions.Item label="劳动收入">
          {data.laborIncome.toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label="非劳动收入">
          {data.passiveIncome.toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label="总支出">
          {data.totalExpense.toLocaleString()}
        </Descriptions.Item>
        <Descriptions.Item label="净资产">
          {(data.netWorth / 10000).toFixed(1)} 万
        </Descriptions.Item>
        <Descriptions.Item label="总负债">
          {data.totalLiabilities.toLocaleString()}
        </Descriptions.Item>
        {bankLoan > 0 && (
          <Descriptions.Item label="银行贷款">
            {bankLoan.toLocaleString()}
          </Descriptions.Item>
        )}
        {creditCardDebt > 0 && (
          <Descriptions.Item label="信用卡透支">
            {creditCardDebt.toLocaleString()}
          </Descriptions.Item>
        )}
        {(circle === "老板" || circle === "核心") && (
          <>
            <Descriptions.Item label="时间积分">
              {timePoints} / 1000
            </Descriptions.Item>
            <Descriptions.Item label="品质生活积分">
              {qualityLifePoints} / 100
            </Descriptions.Item>
          </>
        )}
        <Descriptions.Item label="现金">
          {(cash ?? 0).toLocaleString()}
        </Descriptions.Item>
        {nativeLiabilities && (
          <>
            <Descriptions.Item label="原生·房贷">
              {nativeLiabilities.housingMortgage.toLocaleString()}
            </Descriptions.Item>
            {nativeLiabilities.educationLoan > 0 && (
              <Descriptions.Item label="原生·学贷">
                {nativeLiabilities.educationLoan.toLocaleString()}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="原生·车贷">
              {nativeLiabilities.carLoan.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="原生·信用卡">
              {nativeLiabilities.creditCard.toLocaleString()}
            </Descriptions.Item>
          </>
        )}
      </Descriptions>
    </Card>
  );
}
