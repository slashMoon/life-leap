"use client";

import { Button, Segmented } from "antd";
import { useEffect, useRef, useState } from "react";
import type { CashFlowSnapshot, LifeCircle } from "@/types/game";
import type { NativeLiabilities } from "@/types/identity";
import type { PlayerHolding } from "@/types/player";

function useAmountFlash(value: number) {
  const previous = useRef<number | null>(null);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    const before = previous.current;
    previous.current = value;
    if (before == null || before === value) return;
    setFlash(value > before ? "ll-num-up" : "ll-num-down");
    const timer = window.setTimeout(() => setFlash(""), 720);
    return () => window.clearTimeout(timer);
  }, [value]);

  return flash;
}

function yuan(value: number) {
  return value.toLocaleString("zh-CN");
}

interface CashFlowPanelProps {
  cashFlow?: CashFlowSnapshot | null;
  circle?: LifeCircle;
  cash?: number;
  nativeLiabilities?: NativeLiabilities;
  bankLoan?: number;
  creditCardDebt?: number;
  timePoints?: number;
  qualityLifePoints?: number;
  holdings?: PlayerHolding[];
  round?: number;
  onRepay?: (amount: number) => void;
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
  holdings = [],
  round,
  onRepay,
}: CashFlowPanelProps) {
  const [segment, setSegment] = useState<"flow" | "sheet">("flow");
  const cashFlash = useAmountFlash(cash ?? 0);
  const flowFlash = useAmountFlash(cashFlow?.cashFlow ?? 0);
  const worthFlash = useAmountFlash(cashFlow?.netWorth ?? 0);
  const data = cashFlow ?? {
    laborIncome: 15000,
    passiveIncome: 0,
    totalExpense: 8000,
    cashFlow: 7000,
    netWorth: 50000,
    totalAssets: 50000,
    totalLiabilities: 0,
  };
  const flowUp = data.cashFlow >= 0;
  const worthUp = data.netWorth >= 0;
  const canRepay = (cash ?? 0) > 0 && data.totalLiabilities > 0;

  return (
    <section className="ll-panel ll-ledger" aria-label={`现金流 · ${circle}圈`}>
      <header className="ll-ledger-head">
        <h2>现金流 · {circle}圈</h2>
        {round != null ? <span>第 {round} 回合</span> : null}
      </header>
      <Segmented
        block
        className="ll-ledger-seg"
        value={segment}
        onChange={(value) => setSegment(value as "flow" | "sheet")}
        options={[
          { label: "流水", value: "flow" },
          { label: "资产负债", value: "sheet" },
        ]}
      />

      <div className="ll-ledger-body">
        {segment === "flow" ? (
          <>
            <dl>
              <div className="ll-ledger-row">
                <dt>劳动收入</dt>
                <dd className="ll-gold">{yuan(data.laborIncome)}</dd>
              </div>
              <div className="ll-ledger-row">
                <dt>非劳动收入</dt>
                <dd className="ll-gold">{yuan(data.passiveIncome)}</dd>
              </div>
              <div className="ll-ledger-row">
                <dt>总支出</dt>
                <dd className="ll-down">{yuan(data.totalExpense)}</dd>
              </div>
            </dl>
            <div className={`ll-ledger-spot ${flowUp ? "" : "is-down"} ${flowFlash}`}>
              <span>月现金流</span>
              <strong className={flowUp ? "ll-gold" : "ll-down"}>
                {flowUp ? "+" : ""}
                {yuan(data.cashFlow)}
              </strong>
            </div>
          </>
        ) : (
          <>
            <dl>
              <div className="ll-ledger-row">
                <dt>总资产</dt>
                <dd>{yuan(data.totalAssets)}</dd>
              </div>
              <div className="ll-ledger-row">
                <dt>总负债</dt>
                <dd className="ll-down">{yuan(data.totalLiabilities)}</dd>
              </div>
              {bankLoan > 0 ? (
                <div className="ll-ledger-row">
                  <dt>银行贷款</dt>
                  <dd className="ll-down">{yuan(bankLoan)}</dd>
                </div>
              ) : null}
              {creditCardDebt > 0 ? (
                <div className="ll-ledger-row">
                  <dt>信用卡透支</dt>
                  <dd className="ll-down">{yuan(creditCardDebt)}</dd>
                </div>
              ) : null}
              <div className="ll-ledger-row">
                <dt>现金</dt>
                <dd className={cashFlash}>{yuan(cash ?? 0)}</dd>
              </div>
              {holdings.length > 0 ? (
                <div className="ll-ledger-row">
                  <dt>持仓</dt>
                  <dd>
                    {holdings.length} 项 / {yuan(holdings.reduce((sum, holding) => sum + holding.value, 0))}
                  </dd>
                </div>
              ) : null}
              <div className="ll-ledger-row">
                <dt>时间积分</dt>
                <dd>{timePoints}</dd>
              </div>
              <div className="ll-ledger-row">
                <dt>品质生活积分</dt>
                <dd>{qualityLifePoints}</dd>
              </div>
            </dl>
            <div className={`ll-ledger-spot ${worthUp ? "" : "is-down"} ${worthFlash}`}>
              <span>
                净资产
                {worthUp ? null : <em className="ll-insolvent">资不抵债</em>}
              </span>
              <strong className={worthUp ? "ll-gold" : "ll-down"}>
                {(data.netWorth / 10000).toFixed(1)} 万
              </strong>
            </div>
            {nativeLiabilities ? (
              <>
                <h3>原生负债明细</h3>
                <dl>
                  <div className="ll-ledger-row">
                    <dt>原生·房贷</dt>
                    <dd className="ll-down">{yuan(nativeLiabilities.housingMortgage)}</dd>
                  </div>
                  {nativeLiabilities.educationLoan > 0 ? (
                    <div className="ll-ledger-row">
                      <dt>原生·学贷</dt>
                      <dd className="ll-down">{yuan(nativeLiabilities.educationLoan)}</dd>
                    </div>
                  ) : null}
                  <div className="ll-ledger-row">
                    <dt>原生·车贷</dt>
                    <dd className="ll-down">{yuan(nativeLiabilities.carLoan)}</dd>
                  </div>
                  <div className="ll-ledger-row">
                    <dt>原生·信用卡</dt>
                    <dd className="ll-down">{yuan(nativeLiabilities.creditCard)}</dd>
                  </div>
                </dl>
              </>
            ) : null}
          </>
        )}
      </div>

      {onRepay ? (
        <div className="ll-repay">
          <Button type="primary" disabled={!canRepay} onClick={() => onRepay(1000)}>
            偿还 1,000
          </Button>
          <Button disabled={!canRepay} onClick={() => onRepay(Math.min(cash ?? 0, data.totalLiabilities))}>
            用现金偿还
          </Button>
        </div>
      ) : null}
    </section>
  );
}
