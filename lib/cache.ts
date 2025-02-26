type CacheEntry<T> = {
  value: T;
  expiry: number;
};

class Cache {
  private static instance: Cache;
  private cache: Map<string, CacheEntry<any>>;
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  private constructor() {
    this.cache = new Map();
  }

  public static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }

  set<T>(key: string, value: T, ttl: number = this.DEFAULT_TTL): void {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { value, expiry });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cache = Cache.getInstance(); 