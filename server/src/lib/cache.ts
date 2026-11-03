
import { redis } from '../config/redis';

const DEFAULT_TTL = 3600; // 1 hour in seconds

export class CacheService {
  /**
   * Cache-Aside Pattern Implementation
   */
  static async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttl: number = DEFAULT_TTL): Promise<T> {
    // If Redis is offline/disabled, bypass cache completely
    if (!redis || redis.status !== 'ready') {
        return fetcher();
    }

    try {
      const cachedData = await redis.get(key);
      if (cachedData) {
        return JSON.parse(cachedData) as T;
      }

      const freshData = await fetcher();

      if (freshData) {
        await redis.set(key, JSON.stringify(freshData), 'EX', ttl);
      }

      return freshData;
    } catch (error) {
      console.error(`Cache Error (Bypassing):`, error);
      return fetcher();
    }
  }

  static async invalidate(pattern: string): Promise<void> {
    if (!redis || redis.status !== 'ready') return;

    try {
        const stream = redis.scanStream({ match: pattern });
        stream.on('data', (keys) => {
        if (keys.length) {
            // Use ! assertion because we checked existence at start of function
            const pipeline = redis!.pipeline();
            keys.forEach((key: string) => pipeline.del(key));
            pipeline.exec();
        }
        });
    } catch (e) {
        console.error('Cache Invalidate Error', e);
    }
  }
}
