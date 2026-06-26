import IORedis from "ioredis"
import { logger } from "@/infra/logger"

let _redis: IORedis | null = null

function getRedis(): IORedis {
  if (!_redis) {
    const url = process.env.REDIS_URL
    if (!url) throw new Error("REDIS_URL is required for cache")
    _redis = new IORedis(url, { maxRetriesPerRequest: 1, lazyConnect: true })
    _redis.on("error", (err) => logger.warn({ err }, "Cache Redis error"))
  }
  return _redis
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await getRedis().get(key)
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch (err) {
    logger.warn({ err, key }, "Cache get failed — treating as miss")
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  try {
    await getRedis().set(key, JSON.stringify(value), "EX", ttlSeconds)
  } catch (err) {
    logger.warn({ err, key }, "Cache set failed — continuing without cache")
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await getRedis().del(key)
  } catch (err) {
    logger.warn({ err, key }, "Cache delete failed")
  }
}
