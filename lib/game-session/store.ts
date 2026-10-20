import Redis from "ioredis";
import { createEmptySession } from "./engine";
import type { GameSession } from "./types";

const memory = new Map<string, GameSession>();
const tails = new Map<string, Promise<void>>();

let redisClient: Redis | null | undefined;
let backend: "memory" | "redis" = "memory";

function sessionKey(roomId: string) {
  return `game:${roomId}:session`;
}

async function probeRedis(): Promise<Redis | null> {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) {
    redisClient = null;
    backend = "memory";
    return null;
  }
  const client = new Redis(url, {
    lazyConnect: true,
    connectTimeout: 400,
    maxRetriesPerRequest: 1,
    retryStrategy: () => null,
    enableOfflineQueue: false,
  });
  try {
    await client.connect();
    await client.ping();
    redisClient = client;
    backend = "redis";
    return client;
  } catch {
    client.disconnect();
    redisClient = null;
    backend = "memory";
    return null;
  }
}

export function getSessionBackend(): "memory" | "redis" {
  return backend;
}

export async function ensureSessionBackend(): Promise<"memory" | "redis"> {
  await probeRedis();
  return backend;
}

async function loadFromRedis(roomId: string): Promise<GameSession | null> {
  const redis = await probeRedis();
  if (!redis) return null;
  try {
    const raw = await redis.get(sessionKey(roomId));
    if (!raw) return null;
    return JSON.parse(raw) as GameSession;
  } catch {
    return null;
  }
}

async function persist(session: GameSession) {
  const redis = await probeRedis();
  if (!redis) return;
  try {
    await redis.set(sessionKey(session.roomId), JSON.stringify(session));
  } catch {
    backend = "memory";
  }
}

export async function mutateSession<T>(
  roomId: string,
  fn: (session: GameSession) => T | Promise<T>
): Promise<T> {
  const prev = tails.get(roomId) ?? Promise.resolve();
  const run = prev.then(async () => {
    let session = memory.get(roomId);
    if (!session) {
      session = (await loadFromRedis(roomId)) ?? createEmptySession(roomId);
      memory.set(roomId, session);
    }
    const value = await fn(session);
    memory.set(roomId, session);
    await persist(session);
    return value;
  });
  tails.set(
    roomId,
    run.then(
      () => undefined,
      () => undefined
    )
  );
  return run;
}

export async function readSession(roomId: string): Promise<GameSession | null> {
  const existing = memory.get(roomId);
  if (existing) return existing;
  const loaded = await loadFromRedis(roomId);
  if (loaded) memory.set(roomId, loaded);
  return loaded;
}

/** 测试隔离：清空本进程内存。不连接 Redis。 */
export function resetSessions() {
  memory.clear();
  tails.clear();
}
