import type { RoomConfig } from "@/types/game";
import type { MockRoom, MockUser } from "./types";
import { getIdentity } from "@/lib/constants/identities";
import { ALL_GAME_CARDS } from "@/lib/cards/pool";

export const defaultRoomConfig: RoomConfig = {
  maxPlayers: 6,
  totalRounds: 50,
  difficulty: "normal",
  coreNetWorthThreshold: 200,
  corePassiveIncomeMultiplier: 2,
};

/** 与 Mock API 兼容的卡牌列表（来自 Excel 全量卡牌库） */
export const MOCK_CARDS = ALL_GAME_CARDS.map((c) => ({
  id: c.id,
  type: c.type,
  name: c.name,
  content: c.content,
  effect: c.effect as Record<string, unknown>,
  status: c.status,
}));

export const MOCK_USERS: MockUser[] = [
  {
    id: "user_demo_host",
    nickname: "主持人·小明",
    avatar: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "user_demo_2",
    nickname: "玩家·阿芳",
    avatar: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "user_demo_3",
    nickname: "玩家·大伟",
    avatar: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: "user_demo_4",
    nickname: "玩家·莉莉",
    avatar: null,
    createdAt: new Date().toISOString(),
  },
];

function buildPlayers(
  roomId: string,
  entries: {
    userId: string;
    nickname: string;
    order: number;
    status: string;
    role?: "player" | "banker";
    identityId?: import("@/types/identity").IdentityId;
  }[]
) {
  return entries.map((e, i) => ({
    id: `rp_${roomId}_${i}`,
    roomId,
    userId: e.userId,
    nickname: e.nickname,
    order: e.order,
    status: e.status,
    role: e.role ?? "player",
    circle: "牛马",
    identityId: e.identityId,
    identityName: e.identityId ? getIdentity(e.identityId).name : undefined,
  }));
}

export const SEED_ROOMS: MockRoom[] = [
  {
    id: "room_demo_001",
    code: "DEMO",
    name: "新手体验房",
    password: null,
    mode: "multi",
    isPublic: true,
    fillBots: true,
    status: "waiting",
    config: defaultRoomConfig,
    createdAt: new Date().toISOString(),
    hostUserId: "user_demo_host",
    bankerUserId: "user_demo_host",
    players: buildPlayers("room_demo_001", [
      { userId: "user_demo_host", nickname: "主持人·小明", order: 0, status: "ready", role: "banker" },
      { userId: "user_demo_2", nickname: "玩家·阿芳", order: 1, status: "ready", identityId: "sales_manager" },
      { userId: "user_demo_3", nickname: "玩家·大伟", order: 2, status: "playing", identityId: "driver" },
    ]),
  },
  {
    id: "room_demo_002",
    code: "GOLD",
    name: "老板圈冲刺房",
    password: "8888",
    mode: "multi",
    isPublic: true,
    fillBots: true,
    status: "waiting",
    config: {
      ...defaultRoomConfig,
      difficulty: "hard",
      coreNetWorthThreshold: 300,
    },
    createdAt: new Date().toISOString(),
    hostUserId: "user_demo_4",
    bankerUserId: "user_demo_4",
    players: buildPlayers("room_demo_002", [
      { userId: "user_demo_4", nickname: "玩家·莉莉", order: 0, status: "ready", role: "banker" },
    ]),
  },
];
