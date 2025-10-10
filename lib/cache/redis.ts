// Redis client singleton - using dynamic imports to avoid edge runtime issues
let redis: any = null

// Fallback in-memory store for development/testing
const memoryStore = new Map<string, { value: string; expiry: number }>()

// Environment detection
const isProduction = process.env.NODE_ENV === 'production'
const redisUrl = process.env.REDIS_URL || process.env.KV_URL

export interface CacheStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, expiryMs?: number): Promise<void>
  incr(key: string): Promise<number>
  expire(key: string, expiryMs: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

// Redis implementation
class RedisStore implements CacheStore {
  private client: any

  constructor(client: any) {
    this.client = client
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key)
  }

  async set(key: string, value: string, expiryMs?: number): Promise<void> {
    if (expiryMs) {
      await this.client.setex(key, Math.ceil(expiryMs / 1000), value)
    } else {
      await this.client.set(key, value)
    }
  }

  async incr(key: string): Promise<number> {
    return await this.client.incr(key)
  }

  async expire(key: string, expiryMs: number): Promise<void> {
    await this.client.expire(key, Math.ceil(expiryMs / 1000))
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key)
    return result === 1
  }
}

// Memory implementation (fallback)
class MemoryStore implements CacheStore {
  private store = memoryStore

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key)
    if (!item || Date.now() > item.expiry) {
      this.store.delete(key)
      return null
    }
    return item.value
  }

  async set(key: string, value: string, expiryMs?: number): Promise<void> {
    const expiry = expiryMs ? Date.now() + expiryMs : Number.MAX_SAFE_INTEGER
    this.store.set(key, { value, expiry })
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key)
    const newValue = (parseInt(current || '0') + 1).toString()
    await this.set(key, newValue, 60000) // Default 1 minute expiry for counters
    return parseInt(newValue)
  }

  async expire(key: string, expiryMs: number): Promise<void> {
    const item = this.store.get(key)
    if (item) {
      item.expiry = Date.now() + expiryMs
    }
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }

  async exists(key: string): Promise<boolean> {
    return (await this.get(key)) !== null
  }
}

// Edge Redis implementation (using HTTP API instead of TCP)
class EdgeRedisStore implements CacheStore {
  private client: any

  constructor(client: any) {
    this.client = client
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key)
    } catch (error) {
      console.error('Edge Redis get error:', error)
      return null
    }
  }

  async set(key: string, value: string, expiryMs?: number): Promise<void> {
    try {
      await this.client.set(key, value, expiryMs)
    } catch (error) {
      console.error('Edge Redis set error:', error)
    }
  }

  async incr(key: string): Promise<number> {
    try {
      return await this.client.incr(key)
    } catch (error) {
      console.error('Edge Redis incr error:', error)
      return 1
    }
  }

  async expire(key: string, expiryMs: number): Promise<void> {
    try {
      await this.client.expire(key, expiryMs)
    } catch (error) {
      console.error('Edge Redis expire error:', error)
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key)
    } catch (error) {
      console.error('Edge Redis del error:', error)
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      return await this.client.exists(key)
    } catch (error) {
      console.error('Edge Redis exists error:', error)
      return false
    }
  }
}

// Create and initialize cache store
export function createCacheStore(): CacheStore {
  // Check if we're in edge runtime
  const isEdgeRuntime = process.env.NEXT_RUNTIME === 'edge' ||
                        typeof EdgeRuntime !== 'undefined' ||
                        !process?.versions?.node

  // In production, prefer Redis if available
  if (isProduction && redisUrl) {
    try {
      if (isEdgeRuntime) {
        // Try edge-compatible Redis (Vercel KV) first
        return initializeEdgeRedis() || new MemoryStore()
      } else {
        // Use traditional ioredis for Node.js runtime
        return initializeRedis()
      }
    } catch (error) {
      return new MemoryStore()
    }
  }

  // Fallback to memory store
  return new MemoryStore()
}

// Edge-compatible Redis initialization
function initializeEdgeRedis(): CacheStore | null {
  try {
    const { createEdgeRedisClient } = require('./edge-redis')
    const edgeClient = createEdgeRedisClient()

    if (edgeClient) {
      return new EdgeRedisStore(edgeClient)
    }

    return null
  } catch (error) {
    return null
  }
}

// Separate Redis initialization to avoid edge runtime issues
function initializeRedis(): CacheStore {
  try {
    if (!redis) {
      // Dynamic import to avoid loading in edge runtime
      const Redis = require('ioredis')
      redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      })

      redis.on('error', (err: any) => {
        console.error('Redis connection error:', err)
      })

      redis.on('connect', () => {
        })
    }
    return new RedisStore(redis)
  } catch (error) {
    return new MemoryStore()
  }
}

// Singleton cache instance
let cacheInstance: CacheStore | null = null

export function getCache(): CacheStore {
  if (!cacheInstance) {
    cacheInstance = createCacheStore()
  }
  return cacheInstance
}

// Cleanup memory store periodically
if (!isProduction) {
  setInterval(() => {
    const now = Date.now()
    for (const [key, item] of memoryStore.entries()) {
      if (now > item.expiry) {
        memoryStore.delete(key)
      }
    }
  }, 60000) // Clean every minute
}