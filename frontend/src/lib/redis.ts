import { Redis } from "@upstash/redis";

let redisSingleton: Redis | null = null;

export function getRedis(): Redis {
  if (redisSingleton) {
    return redisSingleton;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Redis environment variables are not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.");
  }

  redisSingleton = new Redis({ url, token });
  return redisSingleton;
}
