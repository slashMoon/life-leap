import assert from "node:assert/strict";
import test from "node:test";
import { roomToJson } from "@/lib/mock";
import { BOT_ROSTER, SYSTEM_BANKER_USER_ID } from "@/lib/mock/bots";
import { mockStore } from "@/lib/mock/store";
import { defaultRoomConfig } from "@/lib/mock/seed";

function board(room: { players: { role: string; bot?: boolean }[] }) {
  return room.players.filter((player) => player.role !== "banker");
}

test("solo start seats the human, system banker, and the requested bots", () => {
  const created = mockStore.createSoloRoom({
    hostUserId: "星尘",
    hostNickname: "星尘",
    botCount: 2,
  });
  assert.equal(created.ok, true);
  if (!created.ok) return;

  const room = created.value;
  assert.equal(room.mode, "solo");
  assert.equal(room.status, "playing");
  assert.equal(room.isPublic, false);
  assert.equal(room.password, null);
  assert.equal(room.bankerUserId, SYSTEM_BANKER_USER_ID);

  const bots = room.players.filter((player) => player.bot);
  assert.equal(bots.length, 2);
  assert.deepEqual(
    bots.map((player) => player.nickname),
    [BOT_ROSTER[0].nickname, BOT_ROSTER[1].nickname]
  );
  assert.equal(board(room).length, 3);
  const human = room.players.find((player) => player.userId === "星尘");
  assert.equal(human?.role, "player");
  assert.ok(human?.identityId);

  const rejected = mockStore.createSoloRoom({ hostUserId: "星尘", botCount: 8 });
  assert.equal(rejected.ok, false);

  const listed = mockStore.listLobbyRooms().some((item) => item.id === room.id);
  assert.equal(listed, false);
});

test("multiplayer password is checked on join and never returned", () => {
  const room = mockStore.createRoom({
    name: "密码房",
    password: "8888",
    hostUserId: "房主甲",
    hostNickname: "房主甲",
    isPublic: false,
    fillBots: true,
    config: { ...defaultRoomConfig, maxPlayers: 4 },
  });

  const json = JSON.stringify(roomToJson(room));
  assert.equal(json.includes("8888"), false);
  assert.equal(json.includes('"password"'), false);
  assert.equal(roomToJson(room).hasPassword, true);

  const missing = mockStore.joinRoom(room.id, "路人乙", "路人乙");
  assert.equal(missing.ok, false);
  if (!missing.ok) assert.equal(missing.reason, "请输入房间密码");

  const wrong = mockStore.joinRoom(room.id, "路人乙", "路人乙", "0000");
  assert.equal(wrong.ok, false);
  if (!wrong.ok) assert.equal(wrong.reason, "房间密码错误");
  assert.equal(
    mockStore.getRoom(room.id)?.players.some((player) => player.userId === "路人乙"),
    false
  );

  const right = mockStore.joinRoom(room.id, "路人乙", "路人乙", "8888");
  assert.equal(right.ok, true);
  const again = mockStore.joinRoom(room.id, "路人乙", "路人乙");
  assert.equal(again.ok, true);

  const hidden = mockStore.createRoom({
    name: "私密房",
    hostUserId: "房主甲",
    isPublic: false,
    fillBots: false,
  });
  assert.equal(
    mockStore.listLobbyRooms().some((item) => item.id === hidden.id),
    false
  );
});

test("only the host can start, and one human plus bot fill reaches two board players", () => {
  const room = mockStore.createRoom({
    name: "补位房",
    hostUserId: "房主丙",
    hostNickname: "房主丙",
    fillBots: true,
    isPublic: true,
    config: { ...defaultRoomConfig, maxPlayers: 4 },
  });
  assert.equal(room.mode, "multi");
  assert.equal(room.bankerUserId, SYSTEM_BANKER_USER_ID);

  const joined = mockStore.joinRoom(room.id, "路人丁", "路人丁");
  assert.equal(joined.ok, true);
  mockStore.assignRandomIdentity(room.id, "房主丙");
  mockStore.assignRandomIdentity(room.id, "路人丁");

  const denied = mockStore.startMatch(room.id, "路人丁", "路人丁");
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.match(denied.reason, /房主/);
  assert.equal(mockStore.getRoom(room.id)?.status, "waiting");

  const started = mockStore.startMatch(room.id, "房主丙", "房主丙");
  assert.equal(started.ok, true);
  if (!started.ok) return;
  assert.equal(started.value.status, "playing");
  assert.equal(started.value.players.filter((player) => player.bot).length, 0);
  assert.ok(board(started.value).length >= 2);

  const short = mockStore.createRoom({
    name: "单人补位",
    hostUserId: "房主戊",
    hostNickname: "房主戊",
    fillBots: true,
    config: { ...defaultRoomConfig, maxPlayers: 4 },
  });
  const blocked = mockStore.startMatch(short.id, "路人己", "路人己");
  assert.equal(blocked.ok, false);

  const unready = mockStore.startMatch(short.id, "房主戊", "房主戊");
  assert.equal(unready.ok, false);
  if (!unready.ok) assert.match(unready.reason, /身份/);

  mockStore.assignRandomIdentity(short.id, "房主戊");
  const filled = mockStore.startMatch(short.id, "房主戊", "房主戊");
  assert.equal(filled.ok, true);
  if (!filled.ok) return;
  const bots = filled.value.players.filter((player) => player.bot);
  assert.equal(bots.length, 1);
  assert.equal(bots[0]?.nickname, "旅人");
  assert.equal(board(filled.value).length, 2);
  assert.equal(filled.value.bankerUserId, SYSTEM_BANKER_USER_ID);

  const closed = mockStore.createRoom({
    name: "不补位",
    hostUserId: "房主庚",
    fillBots: false,
    config: { ...defaultRoomConfig, maxPlayers: 4 },
  });
  mockStore.assignRandomIdentity(closed.id, "房主庚");
  const refused = mockStore.startMatch(closed.id, "房主庚", "房主庚");
  assert.equal(refused.ok, false);
  if (!refused.ok) assert.match(refused.reason, /机器人补位/);
});
