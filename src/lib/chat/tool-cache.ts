// src/lib/chat/tool-cache.ts
// In-memory cache for tool results with TTL

interface CacheEntry {
  result: any;
  timestamp: number;
  ttl: number; // milliseconds
}

class ToolCache {
  private cache: Map<string, CacheEntry> = new Map();

  // Cache TTLs by tool (in milliseconds)
  private ttls: Record<string, number> = {
    queryDatabase: 2 * 60 * 1000,      // 2 minutes - property searches change frequently
    getAppreciation: 10 * 60 * 1000,   // 10 minutes - appreciation data changes slowly
    getMarketStats: 10 * 60 * 1000,    // 10 minutes - market stats relatively stable
    getRegionalStats: 5 * 60 * 1000,   // 5 minutes - regional data
    searchArticles: 30 * 60 * 1000,    // 30 minutes - article content rarely changes
    lookupSubdivision: 60 * 60 * 1000, // 1 hour - subdivision names don't change
    getNeighborhoodPageLink: 60 * 60 * 1000, // 1 hour - page links don't change
  };

  /**
   * Generate cache key from tool name and parameters
   */
  private getCacheKey(toolName: string, params: any): string {
    // Sort keys for consistent hashing
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        // Skip undefined/null values
        if (params[key] !== undefined && params[key] !== null) {
          acc[key] = params[key];
        }
        return acc;
      }, {} as any);

    return `${toolName}:${JSON.stringify(sortedParams)}`;
  }

  /**
   * Get cached result if available and not expired
   */
  get(toolName: string, params: any): any | null {
    const key = this.getCacheKey(toolName, params);
    const entry = this.cache.get(key);

    if (!entry) {
      console.log(`[CACHE MISS] ${toolName}`);
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      console.log(`[CACHE EXPIRED] ${toolName} (age: ${Math.round(age / 1000)}s)`);
      this.cache.delete(key);
      return null;
    }

    console.log(`[CACHE HIT] ${toolName} (age: ${Math.round(age / 1000)}s, ttl: ${Math.round(entry.ttl / 1000)}s)`);
    return entry.result;
  }

  /**
   * Store result in cache
   */
  set(toolName: string, params: any, result: any): void {
    const key = this.getCacheKey(toolName, params);
    const ttl = this.ttls[toolName] || 60000; // default 1 min

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      ttl,
    });

    console.log(`[CACHE SET] ${toolName} (ttl: ${Math.round(ttl / 1000)}s, size: ${this.cache.size} entries)`);
  }

  /**
   * Clear expired entries (run periodically)
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[CACHE CLEANUP] Removed ${removed} expired entries (${this.cache.size} remaining)`);
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[CACHE CLEAR] Cleared ${size} entries`);
  }

  /**
   * Invalidate cache for a specific tool
   */
  invalidate(toolName: string): void {
    let removed = 0;

    for (const [key, _entry] of this.cache.entries()) {
      if (key.startsWith(`${toolName}:`)) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[CACHE INVALIDATE] Removed ${removed} entries for ${toolName}`);
    }
  }

  /**
   * Get cache stats
   */
  getStats() {
    const stats: Record<string, { count: number; totalAge: number; avgAge: number }> = {};
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      const toolName = key.split(':')[0];

      if (!stats[toolName]) {
        stats[toolName] = { count: 0, totalAge: 0, avgAge: 0 };
      }

      stats[toolName].count++;
      stats[toolName].totalAge += now - entry.timestamp;
    }

    // Calculate averages
    for (const toolName in stats) {
      stats[toolName].avgAge = Math.round(stats[toolName].totalAge / stats[toolName].count / 1000); // seconds
    }

    return {
      totalEntries: this.cache.size,
      byTool: stats,
      timestamp: now,
    };
  }
}

// Singleton instance
export const toolCache = new ToolCache();

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => toolCache.cleanup(), 5 * 60 * 1000);
}
