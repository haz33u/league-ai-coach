interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 1000;
  private totalHits = 0;
  private totalMisses = 0;

  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.findLRUKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
        console.log(`🗑️ Cache evicted: ${oldestKey} (LRU)`);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
      hits: 0,
    });

    console.log(`📝 Cache set: ${key} (TTL: ${ttlSeconds}s)`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.totalMisses++;
      return null;
    }

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.totalMisses++;
      console.log(`⏰ Cache expired: ${key}`);
      return null;
    }

    entry.hits++;
    this.totalHits++;

    console.log(`✅ Cache hit: ${key} (hits: ${entry.hits})`);
    return entry.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ Cache deleted: ${key}`);
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ Cache cleared (${size} entries)`);
  }

  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
    }
  }

  getStats() {
    const hitRate = this.totalHits + this.totalMisses > 0
      ? ((this.totalHits / (this.totalHits + this.totalMisses)) * 100).toFixed(2)
      : '0.00';

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRate: `${hitRate}%`,
      keys: Array.from(this.cache.keys()),
    };
  }

  private findLRUKey(): string | null {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < lruTime) {
        lruTime = entry.timestamp;
        lruKey = key;
      }
    }

    return lruKey;
  }

  getMemoryUsage(): string {
    let bytes = 0;
    for (const [key, entry] of this.cache.entries()) {
      bytes += key.length * 2;
      bytes += JSON.stringify(entry.data).length;
      bytes += 24;
    }
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
}

export const cache = new SimpleCache();

if (typeof window === 'undefined') {
  setInterval(() => cache.cleanup(), 5 * 60 * 1000);
} else {
  setInterval(() => cache.cleanup(), 10 * 60 * 1000);
}

if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const stats = cache.getStats();
    console.log('📊 Cache Stats:', stats);
  }, 60 * 1000);
}

export type SimpleCache = typeof cache;
