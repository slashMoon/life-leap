import assert from "node:assert/strict";
import test from "node:test";
import { createPlayerStateFromIdentity, getIdentity } from "@/lib/constants/identities";
import { OUTER_BANK_LOAN, OUTER_CREDIT_CARD } from "@/lib/constants/circle-rules";
import { resolveBoardMove } from "@/lib/game-engine/play-turn";
import { paydayWageLog } from "@/lib/game-engine/tile-effects";
import type { PlayerRuntimeState } from "@/types/player";

function doctorAt(index: number, patch: Partial<PlayerRuntimeState> = {}) {
  return {
    ...createPlayerStateFromIdentity("doctor"),
    boardIndex: index,
    ...patch,
  };
}

function wageLines(state: PlayerRuntimeState, wage: number) {
  const line = paydayWageLog(wage);
  return state.eventLog.filter((entry) => entry === line);
}

test("停在结账日时银行家按月薪发工资，支出和利息仍结算", () => {
  const salary = getIdentity("doctor").salary;
  const before = doctorAt(7, { bankLoan: 10_000, creditCardDebt: 10_000 });
  const interest =
    Math.round(10_000 * OUTER_BANK_LOAN.interestRate) +
    Math.round(10_000 * OUTER_CREDIT_CARD.interestRate);

  const after = resolveBoardMove(before, 1);

  assert.equal(after.boardIndex, 8);
  assert.equal(after.lastTile?.type, "settlement");
  assert.deepEqual(wageLines(after, salary), [paydayWageLog(salary)]);
  assert.equal(salary, before.laborIncome);
  assert.equal(after.cash, before.cash + before.cashFlow.cashFlow - interest);
  assert.notEqual(after.cash - before.cash, salary);
  assert.equal(after.round, before.round + 1);
  assert.equal(after.bankLoan, 11_000);
  assert.equal(after.creditCardDebt, 10_300);
  assert.equal(after.cashFlow.totalExpense, before.cashFlow.totalExpense);
  assert.ok(after.eventLog.some((entry) => entry.includes("回合结账")));
});

test("经过结账日但没有停下时也发一个月薪，不扣支出、不加息", () => {
  const salary = getIdentity("doctor").salary;
  const before = doctorAt(15, {
    track: "inner",
    circle: "老板",
    bankLoan: 10_000,
  });

  const after = resolveBoardMove(before, 2);

  assert.equal(after.boardIndex, 1);
  assert.notEqual(after.lastTile?.type, "settlement");
  assert.deepEqual(wageLines(after, salary), [paydayWageLog(salary)]);
  assert.equal(after.cash, before.cash + salary);
  assert.equal(after.round, before.round);
  assert.equal(after.bankLoan, before.bankLoan);
  assert.equal(after.cashFlow.totalExpense, before.cashFlow.totalExpense);
  assert.equal(
    after.eventLog.some((entry) => entry.includes("回合结账")),
    false
  );
});

test("同一步里路过一次再停在下一次结账日，工资发两次，支出只在落点扣一次", () => {
  const salary = getIdentity("doctor").salary;
  const before = doctorAt(23);
  const after = resolveBoardMove(before, 9);

  assert.equal(after.boardIndex, 8);
  assert.equal(after.lastTile?.type, "settlement");
  assert.equal(wageLines(after, salary).length, 2);
  assert.equal(after.cash, before.cash + salary + before.cashFlow.cashFlow);
  assert.equal(after.round, before.round + 1);
});
