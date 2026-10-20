import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyMarketEffect,
  applyParticipationEffect,
} from "@/lib/cards/apply-effect";
import { getCardById } from "@/lib/cards/pool";
import { createPlayerStateFromIdentity } from "@/lib/constants/identities";
import { resolvePendingDecision } from "@/lib/game-engine/decisions";
import { recalculateCashFlow, repayDebt } from "@/lib/game-engine/ledger";
import { applyCircleTransition } from "@/lib/game-engine/player-finance";
import { applyMonthlySettlement } from "@/lib/game-engine/tile-effects";
import type { GameCard } from "@/lib/cards/types";
import type { PlayerRuntimeState } from "@/types/player";

function card(id: string): GameCard {
  const found = getCardById(id);
  assert.ok(found, `缺少卡牌 ${id}`);
  return found;
}

function promote(state: PlayerRuntimeState) {
  return applyCircleTransition(state, () => undefined);
}

describe("财务账本", () => {
  it("买入股票按股价×股数计入总资产，而不是只剩现金", () => {
    const stock = card("card_d_21");
    const before = recalculateCashFlow({
      ...createPlayerStateFromIdentity("security_guard"),
      cash: 10_000,
    });
    const after = applyParticipationEffect(before, stock);
    const holding = after.holdings[0];

    assert.ok(holding);
    assert.equal(holding.shares, 100);
    assert.equal(holding.sharePrice, 30);
    assert.equal(holding.value, 3000);
    assert.equal(after.cash, before.cash - 3000);
    assert.equal(after.cashFlow.totalAssets, after.cash + 3000);
    assert.equal(after.cashFlow.netWorth, before.cashFlow.netWorth);
  });

  it("买入带贷款的房产：市值含房价，贷款计入负债", () => {
    const house = card("card_a_1");
    const before = recalculateCashFlow({
      ...createPlayerStateFromIdentity("doctor"),
      cash: 20_000,
    });
    const after = applyParticipationEffect(before, house);
    const holding = after.holdings[0];

    assert.ok(holding);
    assert.equal(holding.value, 7000 + 58_000);
    assert.equal(holding.loan, 58_000);
    assert.equal(holding.passiveIncome, 150);
    assert.equal(after.cashFlow.passiveIncome, 150);
    assert.equal(after.cashFlow.totalAssets, after.cash + holding.value);
    assert.ok(after.cashFlow.totalLiabilities >= before.cashFlow.totalLiabilities + 58_000);
    assert.equal(after.cashFlow.netWorth, before.cashFlow.netWorth);
  });

  it("现金可以偿还原生负债", () => {
    const before = recalculateCashFlow({
      ...createPlayerStateFromIdentity("security_guard"),
      cash: 10_000,
    });
    const { state, paid } = repayDebt(before, 10_000);
    assert.equal(paid, 10_000);
    assert.equal(state.cash, 0);
    assert.equal(
      state.cashFlow.totalLiabilities,
      before.cashFlow.totalLiabilities - 10_000
    );
    assert.ok((state.nativeLiabilities?.housingMortgage ?? 0) < (before.nativeLiabilities?.housingMortgage ?? 0));
  });

  it("市场出价只在持有对应资产时出售，没有资产不会凭空加减现金", () => {
    const offer = card("card_c_12");
    const idle = createPlayerStateFromIdentity("security_guard");
    const missed = applyMarketEffect(idle, offer);
    assert.equal(missed.pendingSale, undefined);
    assert.equal(missed.state.cash, idle.cash);
    assert.equal(missed.delta, 0);

    const house = card("card_a_1");
    const owner = applyParticipationEffect(
      recalculateCashFlow({ ...idle, cash: 20_000 }),
      house
    );
    const quoted = applyMarketEffect(owner, offer);
    assert.ok(quoted.pendingSale?.sale);
    assert.equal(quoted.pendingSale?.sale?.price, 140_000);

    const sold = resolvePendingDecision(
      { ...quoted.state, pendingDecision: quoted.pendingSale! },
      true
    );
    assert.equal(sold.holdings.length, 0);
    assert.equal(sold.cashFlow.passiveIncome, 0);
    assert.equal(sold.cash, owner.cash + 140_000 - 58_000);
    assert.ok(sold.cashFlow.totalAssets > sold.cash - 1);
    assert.equal(sold.cashFlow.totalAssets, sold.cash);
  });

  it("送股让对应股票股数和市值翻倍", () => {
    const stock = card("card_d_19");
    const split = card("card_c_34");
    const before = applyParticipationEffect(
      recalculateCashFlow({
        ...createPlayerStateFromIdentity("security_guard"),
        cash: 10_000,
      }),
      stock
    );
    const after = applyMarketEffect(before, split).state;
    const holding = after.holdings[0];
    assert.ok(holding);
    assert.equal(holding.shares, 200);
    assert.equal(holding.value, 8000);
    assert.equal(after.cashFlow.totalAssets, after.cash + 8000);
  });
});

describe("有限回合内可以进入老板圈，核心圈规则也可达成", () => {
  it("保安靠银行票据和结账日进入老板圈", () => {
    const note = card("card_d_43");
    let state = createPlayerStateFromIdentity("security_guard");
    let rounds = 0;

    while (state.circle === "牛马" && rounds < 40) {
      rounds += 1;
      state = applyMonthlySettlement(state);
      if (
        state.cash >= 5000 &&
        state.cashFlow.passiveIncome <= state.cashFlow.totalExpense
      ) {
        state = applyParticipationEffect(state, note);
      }
      state = promote(state);
    }

    assert.equal(state.circle, "老板");
    assert.ok(rounds <= 40, `用了 ${rounds} 回合`);
    assert.ok(state.cashFlow.passiveIncome > state.cashFlow.totalExpense);
    assert.ok(state.cashFlow.totalAssets > state.cash);
  });

  it("同一套账本可以继续满足核心圈的两条门槛", () => {
    const note = card("card_d_43");
    const stock = card("card_d_19");
    const split = card("card_c_34");
    let state = createPlayerStateFromIdentity("security_guard");
    let guard = 0;

    while (state.cashFlow.passiveIncome < state.cashFlow.totalExpense * 2 && guard < 80) {
      guard += 1;
      state = applyMonthlySettlement(state);
      if (state.cash >= 5000) state = applyParticipationEffect(state, note);
    }
    assert.ok(state.cashFlow.passiveIncome >= state.cashFlow.totalExpense * 2);

    state = promote(state);
    assert.equal(state.circle, "老板");

    while (state.cash < 4000 && guard < 120) {
      guard += 1;
      state = applyMonthlySettlement(state);
    }
    state = applyParticipationEffect(state, stock);
    for (let i = 0; i < 12 && state.cashFlow.netWorth < 2_000_000; i += 1) {
      state = applyMarketEffect(state, split).state;
    }

    state = promote(state);
    assert.equal(state.circle, "核心");
    assert.ok(state.cashFlow.netWorth >= 2_000_000);
    assert.ok(state.cashFlow.passiveIncome >= state.cashFlow.totalExpense * 2);
    assert.ok(guard < 120);
  });
});
