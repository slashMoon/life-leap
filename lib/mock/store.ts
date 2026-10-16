import { getIdentity, pickRandomIdentityId } from "@/lib/constants/identities";
import { isMockMode } from "./config";
import { getMinBoardPlayers } from "@/lib/room/start-rules";
import { defaultRoomConfig, MOCK_CARDS, MOCK_USERS, SEED_ROOMS } from "./seed";
import type { MockCard, MockRoom, MockUser } from "./types";
import type { RoomConfig, RoomStatus } from "@/types/game";
import type { IdentityId } from "@/types/identity";
import {
  MAX_BOARD_PLAYERS,
  MAX_ROOM_OCCUPANTS,
} from "@/types/identity";

export const SYSTEM_BANKER_USER_ID = "system_banker";

export type MockStoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

function boardPlayers(room: MockRoom) {
  return room.players.filter((p) => p.role !== "banker");
}

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function makePlayer(
  roomId: string,
  userId: string,
  nickname: string,
  order: number,
  role: "player" | "banker" = "player",
  status = "ready"
) {
  return {
    id: `rp_${roomId}_${order}`,
    roomId,
    userId,
    nickname,
    order,
    status,
    role,
    circle: "牛马",
  };
}

/** 进程内内存存储，开发 Mock 用 */
class MockStore {
  users = new Map<string, MockUser>();
  rooms = new Map<string, MockRoom>();
  cards = new Map<string, MockCard>();

  constructor() {
    MOCK_USERS.forEach((u) => this.users.set(u.id, u));
    SEED_ROOMS.forEach((r) => this.rooms.set(r.id, structuredClone(r)));
    MOCK_CARDS.forEach((c) => this.cards.set(c.id, c));
  }

  listUsers() {
    return [...this.users.values()];
  }

  createUser(nickname: string, avatar?: string | null): MockUser {
    const user: MockUser = {
      id: id("user"),
      nickname,
      avatar: avatar ?? null,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return user;
  }

  listRooms(status?: RoomStatus) {
    const all = [...this.rooms.values()];
    if (!status) return all;
    return all.filter((r) => r.status === status);
  }

  getRoom(roomId: string): MockRoom | undefined {
    return this.rooms.get(roomId);
  }

  createRoom(params: {
    name: string;
    password?: string | null;
    config?: RoomConfig;
    hostUserId?: string;
    hostNickname?: string;
  }): MockRoom {
    const roomId = id("room");
    const config = params.config ?? defaultRoomConfig;
    const players = [];

    if (params.hostUserId) {
      let user = this.users.get(params.hostUserId);
      if (!user && params.hostNickname) {
        user = this.createUser(params.hostNickname);
      }
      const userId = user?.id ?? params.hostUserId;
      const nickname =
        user?.nickname ?? params.hostNickname ?? params.hostUserId;
      players.push(makePlayer(roomId, userId, nickname, 0, "banker"));
    }

    const hostId = players[0]?.userId ?? params.hostUserId ?? null;

    const room: MockRoom = {
      id: roomId,
      name: params.name,
      password: params.password ?? null,
      status: "waiting",
      config,
      createdAt: new Date().toISOString(),
      hostUserId: hostId ?? undefined,
      bankerUserId: hostId,
      players,
    };
    this.rooms.set(roomId, room);
    return room;
  }

  updateRoomStatus(roomId: string, status: RoomStatus): MockRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    room.status = status;
    return room;
  }

  joinRoom(
    roomId: string,
    userId: string,
    nickname: string
  ): MockStoreResult<MockRoom> {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: "房间不存在" };

    const existing = room.players.find(
      (p) => p.userId === userId || p.nickname === nickname
    );
    if (existing) return { ok: true, value: room };

    if (room.players.length >= MAX_ROOM_OCCUPANTS) {
      return {
        ok: false,
        reason: `房间已满（1 名银行家 + 最多 ${MAX_BOARD_PLAYERS} 名玩家）`,
      };
    }

    if (boardPlayers(room).length >= MAX_BOARD_PLAYERS) {
      return {
        ok: false,
        reason: `玩家已满（最多 ${MAX_BOARD_PLAYERS} 名棋盘玩家）`,
      };
    }

    room.players.push(
      makePlayer(roomId, userId, nickname, room.players.length, "player")
    );
    return { ok: true, value: room };
  }

  setBanker(roomId: string, userId: string): MockRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const target = room.players.find(
      (p) => p.userId === userId || p.nickname === userId
    );
    if (!target) return null;

    room.players.forEach((p) => {
      if (p.role === "banker") {
        p.role = "player";
        p.identityId = undefined;
        p.identityName = undefined;
      }
    });

    target.role = "banker";
    target.identityId = undefined;
    target.identityName = undefined;
    target.status = "ready";
    room.bankerUserId = target.userId;
    return room;
  }

  assignRandomIdentity(
    roomId: string,
    userId: string
  ): MockStoreResult<MockRoom & { assignedIdentityId: IdentityId }> {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: "房间不存在" };

    const player = room.players.find(
      (p) => p.userId === userId || p.nickname === userId
    );
    if (!player) return { ok: false, reason: "你不在该房间中" };
    if (player.role === "banker") {
      return { ok: false, reason: "银行家无需选择身份" };
    }

    const identityId = pickRandomIdentityId();
    const identity = getIdentity(identityId);
    player.identityId = identityId;
    player.identityName = identity.name;
    player.status = "ready";
    return { ok: true, value: { ...room, assignedIdentityId: identityId } };
  }

  prepareSoloPlay(roomId: string, userId: string): MockStoreResult<MockRoom> {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: "房间不存在" };

    const human = room.players.find(
      (p) => p.userId === userId || p.nickname === userId
    );
    if (!human) return { ok: false, reason: "你不在该房间中" };

    const board = boardPlayers(room);
    if (board.length > 0) {
      return { ok: false, reason: "房间中已有其他玩家，请直接抽取身份后开始" };
    }

    let systemBanker = room.players.find(
      (p) => p.userId === SYSTEM_BANKER_USER_ID
    );
    room.players.forEach((p) => {
      if (p.role === "banker" && p.userId !== SYSTEM_BANKER_USER_ID) {
        p.role = "player";
      }
    });
    if (!systemBanker) {
      systemBanker = makePlayer(
        roomId,
        SYSTEM_BANKER_USER_ID,
        "系统银行家",
        room.players.length,
        "banker"
      );
      room.players.push(systemBanker);
    } else {
      systemBanker.role = "banker";
      systemBanker.identityId = undefined;
      systemBanker.identityName = undefined;
    }

    if (human.role === "banker" && human.userId !== SYSTEM_BANKER_USER_ID) {
      human.role = "player";
    }

    room.bankerUserId = SYSTEM_BANKER_USER_ID;

    const identityId = pickRandomIdentityId();
    const identity = getIdentity(identityId);
    human.identityId = identityId;
    human.identityName = identity.name;
    human.status = "ready";

    return { ok: true, value: room };
  }

  /** @deprecated 使用 assignRandomIdentity */
  selectIdentity(
    roomId: string,
    userId: string,
    _identityId: IdentityId
  ): MockStoreResult<MockRoom> {
    const result = this.assignRandomIdentity(roomId, userId);
    if (!result.ok) return result;
    const { assignedIdentityId: _, ...room } = result.value;
    return { ok: true, value: room };
  }

  setPlayerReady(roomId: string, userId: string): MockRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    const player = room.players.find(
      (p) => p.userId === userId || p.nickname === userId
    );
    if (!player) return null;
    if (player.role === "banker") {
      player.status = "ready";
      return room;
    }
    if (!player.identityId) return null;
    player.status = "ready";
    return room;
  }

  canStartGame(roomId: string): { ok: boolean; reason?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: "房间不存在" };
    if (room.players.length > MAX_ROOM_OCCUPANTS) {
      return {
        ok: false,
        reason: `房间人数超过上限（最多 ${MAX_ROOM_OCCUPANTS} 人）`,
      };
    }
    if (!room.bankerUserId) {
      return { ok: false, reason: "请先指定一名银行家" };
    }
    const players = boardPlayers(room);
    const minPlayers = getMinBoardPlayers(isMockMode());
    if (players.length < minPlayers) {
      return {
        ok: false,
        reason: `至少需要 ${minPlayers} 名玩家（当前 ${players.length} 名）`,
      };
    }
    if (players.length > MAX_BOARD_PLAYERS) {
      return {
        ok: false,
        reason: `棋盘玩家超过上限（最多 ${MAX_BOARD_PLAYERS} 人）`,
      };
    }
    const missing = players.filter((p) => !p.identityId);
    if (missing.length) {
      return { ok: false, reason: "所有玩家需先随机抽取身份" };
    }
    return { ok: true };
  }

  listCards(type?: string) {
    const all = [...this.cards.values()].filter((c) => c.status);
    if (!type) return all;
    return all.filter((c) => c.type === type);
  }
}

const globalForMock = globalThis as unknown as { mockStore?: MockStore };

function isMockStoreReady(store: MockStore | undefined): store is MockStore {
  return (
    !!store &&
    typeof store.assignRandomIdentity === "function" &&
    typeof store.prepareSoloPlay === "function" &&
    typeof store.setBanker === "function" &&
    typeof store.canStartGame === "function"
  );
}

/** 开发热更新后旧 singleton 可能缺少新方法，需重建并迁移数据 */
function ensureMockStore(): MockStore {
  const existing = globalForMock.mockStore;
  if (isMockStoreReady(existing)) return existing;

  const next = new MockStore();
  if (existing) {
    const stale = existing as MockStore;
    stale.users.forEach((u, k) => next.users.set(k, u));
    stale.rooms.forEach((room, k) => {
      next.rooms.set(k, {
        ...room,
        bankerUserId: room.bankerUserId ?? room.hostUserId ?? null,
        players: room.players.map((p) => ({
          ...p,
          role: p.role ?? (p.userId === room.bankerUserId ? "banker" : "player"),
        })),
      });
    });
    stale.cards.forEach((c, k) => next.cards.set(k, c));
  }

  globalForMock.mockStore = next;
  return next;
}

export const mockStore = ensureMockStore();
