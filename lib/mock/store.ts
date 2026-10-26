import { getIdentity, pickRandomIdentityId } from "@/lib/constants/identities";
import {
  BOT_ROSTER,
  SYSTEM_BANKER_NICKNAME,
  SYSTEM_BANKER_USER_ID,
  normalizeSoloBots,
} from "@/lib/mock/bots";
import { defaultRoomConfig, MOCK_CARDS, MOCK_USERS, SEED_ROOMS } from "./seed";
import { getRoomStartBlockers, isRoomHost } from "@/lib/room/start-rules";
import type { MockCard, MockRoom, MockRoomPlayer, MockUser } from "./types";
import type { GameMode, RoomConfig, RoomStatus } from "@/types/game";
import type { IdentityId } from "@/types/identity";
import { MAX_BOARD_PLAYERS, MAX_ROOM_OCCUPANTS } from "@/types/identity";

export { SYSTEM_BANKER_USER_ID } from "@/lib/mock/bots";
export const PRACTICE_BOT_USER_ID = BOT_ROSTER[0].userId;
export const PRACTICE_BOT_NICKNAME = BOT_ROSTER[0].nickname;

export type MockStoreResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

function boardPlayers(room: MockRoom) {
  return room.players.filter((player) => player.role !== "banker");
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
  status = "waiting"
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

function makeCode(used: Set<string>) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 24; attempt += 1) {
    let code = "";
    for (let index = 0; index < 4; index += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    if (!used.has(code)) return code;
  }
  return id("code").slice(-4).toUpperCase();
}

/** 进程内内存存储，开发 Mock 用 */
class MockStore {
  users = new Map<string, MockUser>();
  rooms = new Map<string, MockRoom>();
  cards = new Map<string, MockCard>();

  constructor() {
    MOCK_USERS.forEach((user) => this.users.set(user.id, user));
    SEED_ROOMS.forEach((room) => this.rooms.set(room.id, structuredClone(room)));
    MOCK_CARDS.forEach((card) => this.cards.set(card.id, card));
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
    return all.filter((room) => room.status === status);
  }

  /** 多人大厅只列出公开、等待中的房间。单机房和私密房不出现。 */
  listLobbyRooms() {
    return [...this.rooms.values()].filter(
      (room) => room.status === "waiting" && room.mode === "multi" && room.isPublic
    );
  }

  getRoom(roomId: string): MockRoom | undefined {
    return this.rooms.get(roomId);
  }

  findByCode(code: string): MockRoom | undefined {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return undefined;
    return [...this.rooms.values()].find((room) => room.code.toUpperCase() === normalized);
  }

  private usedCodes() {
    return new Set([...this.rooms.values()].map((room) => room.code.toUpperCase()));
  }

  private settleHost(params: { hostUserId?: string; hostNickname?: string }) {
    if (!params.hostUserId && !params.hostNickname) return null;
    const userId = params.hostUserId || id("user");
    let user = this.users.get(userId);
    if (!user) {
      user = {
        id: userId,
        nickname: params.hostNickname?.trim() || userId,
        avatar: null,
        createdAt: new Date().toISOString(),
      };
      this.users.set(user.id, user);
    }
    return { userId: user.id, nickname: user.nickname };
  }

  private ensureSystemBanker(room: MockRoom) {
    const humanBanker = room.players.find(
      (player) => player.role === "banker" && player.userId !== SYSTEM_BANKER_USER_ID
    );
    if (humanBanker) {
      room.players = room.players.filter((player) => player.userId !== SYSTEM_BANKER_USER_ID);
      room.bankerUserId = humanBanker.userId;
      return;
    }
    let system = room.players.find((player) => player.userId === SYSTEM_BANKER_USER_ID);
    if (!system) {
      system = makePlayer(
        room.id,
        SYSTEM_BANKER_USER_ID,
        SYSTEM_BANKER_NICKNAME,
        room.players.length,
        "banker",
        "ready"
      );
      room.players.push(system);
    } else {
      system.role = "banker";
      system.nickname = SYSTEM_BANKER_NICKNAME;
      system.status = "ready";
      system.identityId = undefined;
      system.identityName = undefined;
    }
    room.bankerUserId = SYSTEM_BANKER_USER_ID;
  }

  private seatBot(room: MockRoom, slot: (typeof BOT_ROSTER)[number]) {
    const identity = getIdentity(slot.identityId);
    const bot: MockRoomPlayer = {
      ...makePlayer(room.id, slot.userId, slot.nickname, room.players.length, "player", "ready"),
      identityId: identity.id,
      identityName: identity.name,
      bot: true,
    };
    room.players.push(bot);
    return bot;
  }

  private fillShortTable(room: MockRoom) {
    if (!room.fillBots) return;
    const humans = boardPlayers(room).filter((player) => !player.bot);
    if (humans.length < 1 || boardPlayers(room).length >= 2) return;
    const cap = Math.min(MAX_BOARD_PLAYERS, Math.max(2, room.config.maxPlayers));
    let guard = 0;
    while (boardPlayers(room).length < 2 && boardPlayers(room).length < cap && guard < 8) {
      const used = new Set(room.players.map((player) => player.userId));
      const slot = BOT_ROSTER.find((bot) => !used.has(bot.userId));
      if (!slot) break;
      this.seatBot(room, slot);
      guard += 1;
    }
  }

  createRoom(params: {
    name: string;
    password?: string | null;
    config?: RoomConfig;
    hostUserId?: string;
    hostNickname?: string;
    mode?: GameMode;
    isPublic?: boolean;
    fillBots?: boolean;
  }): MockRoom {
    const roomId = id("room");
    const config = params.config ?? defaultRoomConfig;
    const host = this.settleHost(params);
    const players = host
      ? [makePlayer(roomId, host.userId, host.nickname, 0, "player", "waiting")]
      : [];

    const room: MockRoom = {
      id: roomId,
      code: makeCode(this.usedCodes()),
      name: params.name,
      password: params.password?.trim() ? params.password.trim() : null,
      mode: params.mode === "solo" ? "solo" : "multi",
      isPublic: params.isPublic !== false,
      fillBots: params.fillBots !== false,
      status: "waiting",
      config,
      createdAt: new Date().toISOString(),
      hostUserId: host?.userId,
      bankerUserId: null,
      players,
    };
    this.ensureSystemBanker(room);
    this.rooms.set(roomId, room);
    return room;
  }

  createSoloRoom(params: {
    hostUserId?: string;
    hostNickname?: string;
    botCount?: number;
    difficulty?: RoomConfig["difficulty"];
    name?: string;
  }): MockStoreResult<MockRoom> {
    const botCount = normalizeSoloBots(params.botCount ?? 2);
    if (botCount == null) {
      return { ok: false, reason: "机器人数量需要在 1 到 7 之间" };
    }
    const host = this.settleHost(params);
    if (!host) return { ok: false, reason: "请先填写昵称" };

    const room = this.createRoom({
      name: params.name?.trim() || `${host.nickname}的单机局`,
      config: {
        ...defaultRoomConfig,
        maxPlayers: 1 + botCount,
        difficulty: params.difficulty ?? "normal",
      },
      hostUserId: host.userId,
      hostNickname: host.nickname,
      mode: "solo",
      isPublic: false,
      fillBots: false,
    });

    const human = room.players.find((player) => player.userId === host.userId);
    if (!human) return { ok: false, reason: "单机开局失败" };
    const identityId = pickRandomIdentityId();
    const identity = getIdentity(identityId);
    human.role = "player";
    human.identityId = identityId;
    human.identityName = identity.name;
    human.status = "ready";

    for (const slot of BOT_ROSTER.slice(0, botCount)) {
      this.seatBot(room, slot);
    }
    this.ensureSystemBanker(room);
    room.mode = "solo";
    room.isPublic = false;
    room.status = "playing";
    return { ok: true, value: room };
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
    nickname: string,
    password?: string | null
  ): MockStoreResult<MockRoom> {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: "房间不存在" };

    const existing = room.players.find(
      (player) => player.userId === userId || player.nickname === nickname
    );
    if (existing) return { ok: true, value: room };

    if (room.mode === "solo") {
      return { ok: false, reason: "这是单机对局，不能加入" };
    }
    if (room.status !== "waiting") {
      return { ok: false, reason: "对局已开始，无法加入" };
    }
    if (room.password) {
      if (!password) return { ok: false, reason: "请输入房间密码" };
      if (password !== room.password) return { ok: false, reason: "房间密码错误" };
    }

    const humans = boardPlayers(room).filter((player) => !player.bot);
    if (humans.length >= room.config.maxPlayers) {
      return { ok: false, reason: `玩家已满（上限 ${room.config.maxPlayers} 人）` };
    }
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

    room.players.push(makePlayer(roomId, userId, nickname, room.players.length, "player", "waiting"));
    return { ok: true, value: room };
  }

  setBanker(roomId: string, userId: string): MockRoom | null {
    const room = this.rooms.get(roomId);
    if (!room || room.status === "playing") return null;

    const target = room.players.find(
      (player) => player.userId === userId || player.nickname === userId
    );
    if (!target || target.bot || target.userId === SYSTEM_BANKER_USER_ID) return null;

    room.players = room.players.filter((player) => player.userId !== SYSTEM_BANKER_USER_ID);
    room.players.forEach((player) => {
      if (player.role === "banker") {
        player.role = "player";
        player.identityId = undefined;
        player.identityName = undefined;
        player.status = "waiting";
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
      (item) => item.userId === userId || item.nickname === userId
    );
    if (!player) return { ok: false, reason: "你不在该房间中" };
    if (player.role === "banker") {
      return { ok: false, reason: "银行家无需选择身份" };
    }
    if (player.bot) return { ok: false, reason: "机器人身份已分配" };

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
      (player) => player.userId === userId || player.nickname === userId
    );
    if (!human) return { ok: false, reason: "你不在该房间中" };

    const board = boardPlayers(room).filter((player) => !player.bot);
    if (board.length > 1 || (board.length === 1 && board[0]?.userId !== human.userId && board[0]?.nickname !== userId)) {
      return { ok: false, reason: "房间中已有其他玩家，请直接抽取身份后开始" };
    }

    room.players.forEach((player) => {
      if (player.role === "banker" && player.userId !== SYSTEM_BANKER_USER_ID) {
        player.role = "player";
      }
    });
    human.role = "player";
    const identityId = pickRandomIdentityId();
    const identity = getIdentity(identityId);
    human.identityId = identityId;
    human.identityName = identity.name;
    human.status = "ready";

    if (!room.players.some((player) => player.bot)) {
      this.seatBot(room, BOT_ROSTER[0]);
    }
    this.ensureSystemBanker(room);
    room.mode = "solo";
    room.isPublic = false;
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
      (item) => item.userId === userId || item.nickname === userId
    );
    if (!player || player.bot) return null;
    if (player.role === "banker") {
      player.status = "ready";
      return room;
    }
    if (!player.identityId) return null;
    player.status = "ready";
    return room;
  }

  canStartGame(roomId: string, userId?: string, nickname?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: "房间不存在" };
    if (room.mode === "solo") return { ok: true };
    const blockers = getRoomStartBlockers({
      mode: room.mode,
      fillBots: room.fillBots,
      maxPlayers: room.config.maxPlayers,
      hostUserId: room.hostUserId,
      bankerUserId: room.bankerUserId,
      actorUserId: userId,
      actorNickname: nickname,
      players: room.players,
    });
    if (blockers.length) return { ok: false, reason: blockers[0] };
    return { ok: true };
  }

  startMatch(roomId: string, userId: string, nickname?: string): MockStoreResult<MockRoom> {
    const room = this.rooms.get(roomId);
    if (!room) return { ok: false, reason: "房间不存在" };
    if (!isRoomHost(room, userId, nickname)) {
      return { ok: false, reason: "只有房主可以开始" };
    }
    if (room.status === "playing") return { ok: true, value: room };
    if (room.mode === "solo") {
      room.status = "playing";
      return { ok: true, value: room };
    }

    this.ensureSystemBanker(room);
    this.fillShortTable(room);
    const blockers = getRoomStartBlockers({
      mode: room.mode,
      fillBots: room.fillBots,
      maxPlayers: room.config.maxPlayers,
      hostUserId: room.hostUserId,
      bankerUserId: room.bankerUserId,
      players: room.players,
    });
    if (blockers.length) return { ok: false, reason: blockers[0] };
    room.status = "playing";
    room.players.forEach((player) => {
      if (player.role !== "banker") player.status = "playing";
    });
    return { ok: true, value: room };
  }

  listCards(type?: string) {
    const all = [...this.cards.values()].filter((card) => card.status);
    if (!type) return all;
    return all.filter((card) => card.type === type);
  }
}

const globalForMock = globalThis as unknown as { mockStore?: MockStore };

function isMockStoreReady(store: MockStore | undefined): store is MockStore {
  return (
    !!store &&
    typeof store.assignRandomIdentity === "function" &&
    typeof store.prepareSoloPlay === "function" &&
    typeof store.setBanker === "function" &&
    typeof store.canStartGame === "function" &&
    typeof store.createSoloRoom === "function" &&
    typeof store.startMatch === "function" &&
    typeof store.findByCode === "function" &&
    typeof store.listLobbyRooms === "function"
  );
}

/** 开发热更新后旧 singleton 可能缺少新方法，需重建并迁移数据 */
function ensureMockStore(): MockStore {
  const existing = globalForMock.mockStore;
  if (isMockStoreReady(existing)) return existing;

  const next = new MockStore();
  if (existing) {
    const stale = existing as MockStore;
    stale.users.forEach((user, key) => next.users.set(key, user));
    stale.rooms.forEach((room, key) => {
      const migrated: MockRoom = {
        ...room,
        code: room.code || room.id.slice(-4).toUpperCase(),
        mode: room.mode ?? "multi",
        isPublic: room.isPublic ?? room.mode !== "solo",
        fillBots: room.fillBots ?? room.mode !== "solo",
        bankerUserId: room.bankerUserId ?? null,
        players: room.players.map((player) => ({
          ...player,
          role: player.role ?? (player.userId === room.bankerUserId ? "banker" : "player"),
        })),
      };
      next.rooms.set(key, migrated);
    });
    stale.cards.forEach((card, key) => next.cards.set(key, card));
  }

  globalForMock.mockStore = next;
  return next;
}

export const mockStore = ensureMockStore();
