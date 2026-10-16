import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedisClient(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  return new Redis(url, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
}

export const redis = globalForRedis.redis ?? createRedisClient();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}

/** Redis key 前缀 */
export const RedisKeys = {
  roomState: (roomId: string) => `room:${roomId}:state`,
  roomLock: (roomId: string) => `room:${roomId}:lock`,
  playerOnline: (userId: string) => `player:${userId}:online`,
  gameSession: (roomId: string) => `game:${roomId}:session`,
} as const;
