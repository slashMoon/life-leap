/** 机器人节奏和掉线代掷。测试可以按房间改短，不影响其他对局。 */
export const turnTiming = {
  botDelayMs: 1400,
  disconnectMs: 30_000,
};

const roomTiming = new Map<string, Partial<typeof turnTiming>>();

export function setRoomTiming(roomId: string, next: Partial<typeof turnTiming>) {
  roomTiming.set(roomId, { ...roomTiming.get(roomId), ...next });
}

export function clearRoomTiming(roomId?: string) {
  if (roomId) roomTiming.delete(roomId);
  else roomTiming.clear();
}

export function timingFor(roomId: string) {
  return { ...turnTiming, ...roomTiming.get(roomId) };
}
