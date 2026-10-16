import { buildCashFlowSnapshot } from "@/lib/rule-engine";
import type { GameIdentity, IdentityId } from "@/types/identity";
import type { PlayerRuntimeState } from "@/types/player";

export const GAME_IDENTITIES: GameIdentity[] = [
  {
    id: "doctor",
    tier: "high",
    order: 1,
    name: "医生",
    bankSavings: 500,
    salary: 12000,
    totalExpense: 8630,
    liquidCash: 3370,
    childExpensePerChild: 480,
    nativeLiabilities: {
      housingMortgage: 166000,
      educationLoan: 0,
      carLoan: 18750,
      creditCard: 27500,
      extra: 1250,
    },
  },
  {
    id: "lawyer",
    tier: "high",
    order: 2,
    name: "律师",
    bankSavings: 500,
    salary: 9500,
    totalExpense: 6750,
    liquidCash: 2750,
    childExpensePerChild: 380,
    nativeLiabilities: {
      housingMortgage: 137500,
      educationLoan: 97500,
      carLoan: 13750,
      creditCard: 7500,
      extra: 1250,
    },
  },
  {
    id: "sales_manager",
    tier: "middle",
    order: 3,
    name: "销售经理",
    bankSavings: 500,
    salary: 5750,
    totalExpense: 3650,
    liquidCash: 2100,
    childExpensePerChild: 240,
    nativeLiabilities: {
      housingMortgage: 87000,
      educationLoan: 15000,
      carLoan: 7500,
      creditCard: 3750,
      extra: 1250,
    },
  },
  {
    id: "it_technician",
    tier: "middle",
    order: 4,
    name: "IT技术员",
    bankSavings: 600,
    salary: 4000,
    totalExpense: 2580,
    liquidCash: 1420,
    childExpensePerChild: 170,
    nativeLiabilities: {
      housingMortgage: 50000,
      educationLoan: 7500,
      carLoan: 6250,
      creditCard: 3750,
      extra: 1250,
    },
  },
  {
    id: "driver",
    tier: "low",
    order: 5,
    name: "司机",
    bankSavings: 950,
    salary: 3200,
    totalExpense: 2030,
    liquidCash: 1170,
    childExpensePerChild: 140,
    nativeLiabilities: {
      housingMortgage: 50000,
      educationLoan: 0,
      carLoan: 5000,
      creditCard: 2500,
      extra: 1250,
    },
  },
  {
    id: "security_guard",
    tier: "low",
    order: 6,
    name: "保安",
    bankSavings: 700,
    salary: 2000,
    totalExpense: 1200,
    liquidCash: 800,
    childExpensePerChild: 70,
    nativeLiabilities: {
      housingMortgage: 25000,
      educationLoan: 0,
      carLoan: 5000,
      creditCard: 2500,
      extra: 1250,
    },
  },
];

const identityMap = new Map(GAME_IDENTITIES.map((i) => [i.id, i]));

export function getIdentity(id: IdentityId): GameIdentity {
  const identity = identityMap.get(id);
  if (!identity) throw new Error(`未知身份: ${id}`);
  return identity;
}

export function sumNativeLiabilities(liabilities: GameIdentity["nativeLiabilities"]) {
  return (
    liabilities.housingMortgage +
    liabilities.educationLoan +
    liabilities.carLoan +
    liabilities.creditCard +
    liabilities.extra
  );
}

export function createPlayerStateFromIdentity(identityId: IdentityId): PlayerRuntimeState {
  const identity = getIdentity(identityId);
  const totalLiabilities = sumNativeLiabilities(identity.nativeLiabilities);
  const cash = identity.bankSavings + identity.liquidCash;
  const totalAssets = cash;

  const cashFlow = buildCashFlowSnapshot({
    laborIncome: identity.salary,
    passiveIncome: 0,
    totalExpense: identity.totalExpense,
    totalAssets,
    totalLiabilities,
  });

  return {
    track: "outer",
    boardIndex: 0,
    circle: "牛马",
    round: 1,
    cash,
    cashFlow,
    identityId,
    identityName: identity.name,
    identityTier: identity.tier,
    nativeLiabilities: { ...identity.nativeLiabilities },
    childrenCount: 0,
    childExpensePerChild: identity.childExpensePerChild,
    cashAtCircleEntry: cash,
    timePoints: 0,
    qualityLifePoints: 0,
    bankLoan: 0,
    creditCardDebt: 0,
    windFireWheel: false,
    lastDice: null,
    lastTile: null,
    lastEvent: null,
    pendingDecision: null,
    eventLog: [
      `游戏开始 · ${identity.name} · 牛马圈 · 起点结账日`,
      `原生负债 ${totalLiabilities.toLocaleString()} 元 · 月现金流 ${cashFlow.cashFlow.toLocaleString()} 元`,
    ],
  };
}

export function listIdentitiesByTier(tier: GameIdentity["tier"]) {
  return GAME_IDENTITIES.filter((i) => i.tier === tier);
}

/** 从身份池随机抽取（可复用，允许多人同身份） */
export function pickRandomIdentityId(): IdentityId {
  const index = Math.floor(Math.random() * GAME_IDENTITIES.length);
  return GAME_IDENTITIES[index]!.id;
}
