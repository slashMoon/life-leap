export { isMockMode } from "./config";
export { mockStore } from "./store";
export { defaultRoomConfig } from "./seed";

export function roomToJson(room: import("./types").MockRoom) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    hasPassword: Boolean(room.password),
    mode: room.mode ?? "multi",
    isPublic: room.isPublic ?? true,
    fillBots: room.fillBots ?? false,
    status: room.status,
    config: room.config,
    createdAt: room.createdAt,
    hostUserId: room.hostUserId,
    bankerUserId: room.bankerUserId,
    players: room.players.map((p) => ({
      id: p.id,
      userId: p.userId,
      nickname: p.nickname,
      order: p.order,
      status: p.status,
      role: p.role,
      circle: p.circle,
      identityId: p.identityId,
      identityName: p.identityName,
      bot: p.bot || undefined,
    })),
  };
}
