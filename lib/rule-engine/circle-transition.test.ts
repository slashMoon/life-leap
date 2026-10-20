import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCashFlowSnapshot } from "@/lib/rule-engine/cash-flow";
import {
  buildTransitionContext,
  evaluateCircleTransition,
} from "@/lib/rule-engine/circle-transition";
import type { PlayerRuntimeState } from "@/types/player";

function snapshot(partial: {
  passiveIncome: number;
  totalExpense: number;
  netWorth: number;
  totalLiabilities?: number;
}) {
  const totalLiabilities = partial.totalLiabilities ?? 0;
  return buildCashFlowSnapshot({
    laborIncome: 2000,
    passiveIncome: partial.passiveIncome,
    totalExpense: partial.totalExpense,
    totalAssets: partial.netWorth + totalLiabilities,
    totalLiabilities,
  });
}

describe("圈层跃迁", () => {
  it("牛马圈：被动收入大于总支出即可进入老板圈，负债不阻挡", () => {
    const result = evaluateCircleTransition({
      circle: "牛马",
      cashFlow: snapshot({
        passiveIncome: 1500,
        totalExpense: 1200,
        netWorth: -30_000,
        totalLiabilities: 33_750,
      }),
    });
    assert.equal(result.changed, true);
    assert.equal(result.to, "老板");
  });

  it("牛马圈：被动收入未超过总支出时停留", () => {
    const result = evaluateCircleTransition({
      circle: "牛马",
      cashFlow: snapshot({
        passiveIncome: 1200,
        totalExpense: 1200,
        netWorth: 0,
      }),
    });
    assert.equal(result.changed, false);
    assert.equal(result.to, "牛马");
  });

  it("老板圈：净资产达到 200 万且被动收入达到 2 倍支出时进入核心圈", () => {
    const result = evaluateCircleTransition({
      circle: "老板",
      cashFlow: snapshot({
        passiveIncome: 2400,
        totalExpense: 1200,
        netWorth: 2_000_000,
      }),
    });
    assert.equal(result.changed, true);
    assert.equal(result.to, "核心");
  });

  it("老板圈：只满足其中一条时不跃迁", () => {
    const richOnly = evaluateCircleTransition({
      circle: "老板",
      cashFlow: snapshot({
        passiveIncome: 1000,
        totalExpense: 1200,
        netWorth: 3_000_000,
      }),
    });
    const incomeOnly = evaluateCircleTransition({
      circle: "老板",
      cashFlow: snapshot({
        passiveIncome: 5000,
        totalExpense: 1200,
        netWorth: 1_999_999,
      }),
    });
    assert.equal(richOnly.changed, false);
    assert.equal(incomeOnly.changed, false);
  });

  it("房间配置的核心门槛单位是万", () => {
    const player = {
      circle: "老板",
      cashFlow: snapshot({
        passiveIncome: 10_000,
        totalExpense: 1000,
        netWorth: 2_000_000,
      }),
      coreNetWorthThreshold: 300,
      corePassiveIncomeMultiplier: 2,
    } as Pick<
      PlayerRuntimeState,
      "circle" | "cashFlow" | "coreNetWorthThreshold" | "corePassiveIncomeMultiplier"
    >;
    const blocked = evaluateCircleTransition(buildTransitionContext(player));
    assert.equal(blocked.changed, false);

    const passed = evaluateCircleTransition(
      buildTransitionContext({
        ...player,
        cashFlow: snapshot({
          passiveIncome: 10_000,
          totalExpense: 1000,
          netWorth: 3_000_000,
        }),
      })
    );
    assert.equal(passed.changed, true);
    assert.equal(passed.to, "核心");
  });
});
