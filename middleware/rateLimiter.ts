import { LRUCache } from 'lru-cache'

type Options = {
  uniqueTokenPerInterval?: number
  interval?: number
}

export function createRateLimiter(options: Options = {}) {
  const tokenCache = new LRUCache({
    max: options.uniqueTokenPerInterval || 500,
    ttl: options.interval || 60000 // 1 minute default
  })

  return {
    check: (req: Request, limit: number, token: string) => {
    }
  }
} 