// Safe Redis implementation that never imports ioredis on client side
// This prevents any DNS/TLS module errors completely

// Environment detection
const isProduction = process.env.NODE_ENV === 'production'
const isServer = typeof window === 'undefined'
const isNodeRuntime = isServer && typeof process !== 'undefined' && process.versions?.node

// Fallback in-memory store
const memoryStore = new Map<string, { value: string; expiry: number }>()

export interface SafeCacheStore {
  get(key: string): Promise<string | null>
  set(key: string, value: string, expiryMs?: number): Promise<void>
  incr(key: string): Promise<number>
  expire(key: string, expiryMs: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

// Memory implementation (always available)
class MemoryStore implements SafeCacheStore {
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

// Server-only Redis wrapper (never loaded on client)
class ServerRedisStore implements SafeCacheStore {
  private client: any = null
  private memoryFallback = new MemoryStore()

  constructor() {
    // Only initialize on server-side in Node.js runtime
    if (isNodeRuntime) {
      this.initializeRedis()
    }
  }

  private initializeRedis() {
    try {
      // Dynamic require to avoid any bundling issues
      const Redis = eval('require')('ioredis')
      const redisUrl = process.env.REDIS_URL || process.env.KV_URL

      if (!redisUrl) {
        return
      }

      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: false, // Disable ready check to avoid DNS issues
        lazyConnect: true,
        connectTimeout: 10000,
        commandTimeout: 5000,
        retryDelayOnFailover: 100,
      })

      this.client.on('error', (err: any) => {
        this.client = null
      })

      this.client.on('connect', () => {
        })

      } catch (error) {
      this.client = null
    }
  }

  async get(key: string): Promise<string | null> {
    if (!this.client || !isNodeRuntime) {
      return this.memoryFallback.get(key)
    }

    try {
      return await this.client.get(key)
    } catch (error) {
      return this.memoryFallback.get(key)
    }
  }

  async set(key: string, value: string, expiryMs?: number): Promise<void> {
    if (!this.client || !isNodeRuntime) {
      return this.memoryFallback.set(key, value, expiryMs)
    }

    try {
      if (expiryMs) {
        await this.client.setex(key, Math.ceil(expiryMs / 1000), value)
      } else {
        await this.client.set(key, value)
      }
    } catch (error) {
      return this.memoryFallback.set(key, value, expiryMs)
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.client || !isNodeRuntime) {
      return this.memoryFallback.incr(key)
    }

    try {
      return await this.client.incr(key)
    } catch (error) {
      return this.memoryFallback.incr(key)
    }
  }

  async expire(key: string, expiryMs: number): Promise<void> {
    if (!this.client || !isNodeRuntime) {
      return this.memoryFallback.expire(key, expiryMs)
    }

    try {
      await this.client.expire(key, Math.ceil(expiryMs / 1000))
    } catch (error) {
      return this.memoryFallback.expire(key, expiryMs)
    }
  }

  async del(key: string): Promise<void> {
    if (!this.client || !isNodeRuntime) {
      return this.memoryFallback.del(key)
    }

    try {
      await this.client.del(key)
    } catch (error) {
      return this.memoryFallback.del(key)
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.client || !isNodeRuntime) {
      return this.memoryFallback.exists(key)
    }

    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error) {
      return this.memoryFallback.exists(key)
    }
  }
}

// Create cache store - completely safe for all environments
export function createSafeCacheStore(): SafeCacheStore {
  // Client-side: Always use memory store
  if (!isServer) {
    return new MemoryStore()
  }

  // Server-side: Try Redis in production, memory otherwise
  if (isProduction && isNodeRuntime) {
    return new ServerRedisStore()
  }

  return new MemoryStore()
}

// Singleton cache instance
let cacheInstance: SafeCacheStore | null = null

export function getSafeCache(): SafeCacheStore {
  if (!cacheInstance) {
    cacheInstance = createSafeCacheStore()
  }
  return cacheInstance
}

// Get Redis connection for BullMQ (returns null if Redis is not available)
export function getRedisConnection(): any {
  if (!isNodeRuntime) {
    return null
  }

  try {
    const Redis = eval('require')('ioredis')
    const redisUrl = process.env.REDIS_URL || process.env.KV_URL

    if (!redisUrl) {
      console.warn('[REDIS] No Redis URL configured, queue features disabled')
      return null
    }

    return new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      lazyConnect: false,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnFailover: 100,
    })
  } catch (error) {
    console.error('[REDIS] Failed to create Redis connection:', error)
    return null
  }
}

// Cleanup memory store periodically (only in development)
if (!isProduction && isServer) {
  setInterval(() => {
    const now = Date.now()
    for (const [key, item] of memoryStore.entries()) {
      if (now > item.expiry) {
        memoryStore.delete(key)
      }
    }
  }, 60000) // Clean every minute
}