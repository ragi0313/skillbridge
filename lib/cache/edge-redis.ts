// Edge-compatible Redis implementation using HTTP API
// This avoids the DNS module issue by using REST API calls instead of raw TCP connections

export interface EdgeRedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, expiryMs?: number): Promise<void>
  incr(key: string): Promise<number>
  expire(key: string, expiryMs: number): Promise<void>
  del(key: string): Promise<void>
  exists(key: string): Promise<boolean>
}

// Use Vercel KV (which is edge-compatible) if available
export function createEdgeRedisClient(): EdgeRedisClient | null {
  const kvRestApiUrl = process.env.KV_REST_API_URL
  const kvRestApiToken = process.env.KV_REST_API_TOKEN

  if (!kvRestApiUrl || !kvRestApiToken) {
    return null
  }

  return new VercelKVClient(kvRestApiUrl, kvRestApiToken)
}

class VercelKVClient implements EdgeRedisClient {
  constructor(
    private apiUrl: string,
    private token: string
  ) {}

  private async request(command: string[]): Promise<any> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(command),
      })

      if (!response.ok) {
        throw new Error(`KV API error: ${response.status}`)
      }

      const data = await response.json()
      return data.result
    } catch (error) {
      console.error('Edge Redis request failed:', error)
      throw error
    }
  }

  async get(key: string): Promise<string | null> {
    const result = await this.request(['GET', key])
    return result
  }

  async set(key: string, value: string, expiryMs?: number): Promise<void> {
    if (expiryMs) {
      const expirySeconds = Math.ceil(expiryMs / 1000)
      await this.request(['SETEX', key, expirySeconds.toString(), value])
    } else {
      await this.request(['SET', key, value])
    }
  }

  async incr(key: string): Promise<number> {
    const result = await this.request(['INCR', key])
    return parseInt(result)
  }

  async expire(key: string, expiryMs: number): Promise<void> {
    const expirySeconds = Math.ceil(expiryMs / 1000)
    await this.request(['EXPIRE', key, expirySeconds.toString()])
  }

  async del(key: string): Promise<void> {
    await this.request(['DEL', key])
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.request(['EXISTS', key])
    return result === 1
  }
}