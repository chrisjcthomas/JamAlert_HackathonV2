
import { PrismaClient } from '@prisma/client';
import { log } from '../utils/logger';

const prisma = new PrismaClient();

/**
 * Retrieves a cached value by its key.
 *
 * @param {string} key The key of the cached item.
 * @returns {Promise<T | null>} The cached value, or null if not found or expired.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cachedItem = await prisma.cache.findUnique({
      where: { key },
    });

    if (!cachedItem) {
      return null;
    }

    if (new Date() > cachedItem.expiresAt) {
      // Cache has expired, so we'll delete it.
      await prisma.cache.delete({ where: { key } });
      return null;
    }

    return cachedItem.value as T;
  } catch (error) {
    log.error(`Error getting cache for key "${key}":`, error);
    return null;
  }
}

/**
 * Sets a value in the cache with a specified TTL (time-to-live).
 *
 * @param {string} key The key for the cached item.
 * @param {T} value The value to cache.
 * @param {number} ttlSeconds The time-to-live in seconds.
 */
export async function setCache<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    await prisma.cache.upsert({
      where: { key },
      update: { value: value as any, expiresAt },
      create: { key, value: value as any, expiresAt },
    });
  } catch (error) {
    log.error(`Error setting cache for key "${key}":`, error);
  }
}

/**
 * Deletes a cached item by its key.
 *
 * @param {string} key The key of the cached item to delete.
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await prisma.cache.delete({
      where: { key },
    });
  } catch (error) {
    // It's possible the item we're trying to delete is already gone, so we'll just log the error.
    log.error(`Error deleting cache for key "${key}":`, error);
  }
}

/**
 * Clears all expired cache entries from the database.
 * This can be run periodically as a cleanup task.
 */
export async function clearExpiredCache(): Promise<void> {
  try {
    await prisma.cache.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  } catch (error) {
    log.error('Error clearing expired cache:', error);
  }
}
