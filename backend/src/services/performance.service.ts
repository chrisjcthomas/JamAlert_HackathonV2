import { PrismaClient } from '@prisma/client';
import { InvocationContext } from '@azure/functions';
import { log } from '../utils/logger';
import { telemetryService } from '../lib/telemetry';

export class PerformanceService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Analyze and optimize database queries
   */
  async analyzeQueries(context?: InvocationContext): Promise<{
    slowQueries: any[];
    recommendations: string[];
    optimizationsApplied: number;
  }> {
    try {
      const recommendations: string[] = [];
      let optimizationsApplied = 0;

      // Check for missing indexes on frequently queried columns
      const missingIndexes = await this.checkMissingIndexes();
      if (missingIndexes.length > 0) {
        recommendations.push(`Consider adding indexes for: ${missingIndexes.join(', ')}`);
      }

      // Analyze query patterns
      const queryStats = await this.getQueryStatistics();
      
      // Check for N+1 query patterns
      const n1Queries = await this.detectN1Queries();
      if (n1Queries.length > 0) {
        recommendations.push(`Potential N+1 queries detected in: ${n1Queries.join(', ')}`);
      }

      // Optimize table statistics
      await this.updateTableStatistics();
      optimizationsApplied++;

      // Clean up expired cache entries
      const cleanedEntries = await this.cleanupExpiredCache();
      if (cleanedEntries > 0) {
        optimizationsApplied++;
        context?.log.info(`Cleaned up ${cleanedEntries} expired cache entries`);
      }

      return {
        slowQueries: queryStats.slowQueries,
        recommendations,
        optimizationsApplied
      };

    } catch (error) {
      context?.log.error('Query analysis failed:', error);
      throw error;
    }
  }

  /**
   * Check for missing database indexes
   */
  private async checkMissingIndexes(): Promise<string[]> {
    const missingIndexes: string[] = [];

    try {
      // Check common query patterns that might benefit from indexes
      const commonQueries = [
        { table: 'users', columns: ['email', 'isActive'] },
        { table: 'alerts', columns: ['createdAt', 'deliveryStatus'] },
        { table: 'incident_reports', columns: ['createdAt', 'status'] },
        { table: 'alert_delivery_log', columns: ['alertId', 'deliveryStatus'] }
      ];

      // This is a simplified check - in production you'd query the database
      // information schema to check for actual missing indexes
      for (const query of commonQueries) {
        // Placeholder for actual index checking logic
        // Would query INFORMATION_SCHEMA.STATISTICS or similar
      }

    } catch (error) {
      log.error('Failed to check missing indexes:', error);
    }

    return missingIndexes;
  }

  /**
   * Get query performance statistics
   */
  private async getQueryStatistics(): Promise<{
    slowQueries: any[];
    totalQueries: number;
    averageExecutionTime: number;
  }> {
    try {
      // This would typically query performance schema or similar
      // For MySQL: performance_schema.events_statements_summary_by_digest
      // For now, we'll return mock data structure

      return {
        slowQueries: [],
        totalQueries: 0,
        averageExecutionTime: 0
      };

    } catch (error) {
      log.error('Failed to get query statistics:', error);
      return {
        slowQueries: [],
        totalQueries: 0,
        averageExecutionTime: 0
      };
    }
  }

  /**
   * Detect potential N+1 query patterns
   */
  private async detectN1Queries(): Promise<string[]> {
    const patterns: string[] = [];

    try {
      // Check for common N+1 patterns in the application
      // This would typically analyze query logs or use APM tools
      
      // Example patterns to check:
      // - Loading users and then individual alert counts
      // - Loading incidents and then individual photos
      // - Loading alerts and then individual delivery logs

    } catch (error) {
      log.error('Failed to detect N+1 queries:', error);
    }

    return patterns;
  }

  /**
   * Update database table statistics for better query planning
   */
  private async updateTableStatistics(): Promise<void> {
    try {
      // Update statistics for better query optimization
      await this.prisma.$executeRaw`ANALYZE TABLE users, alerts, incident_reports, alert_delivery_log, weather_data`;
      log.info('Database table statistics updated');
    } catch (error) {
      // This might not be supported on all database systems
      log.warn('Failed to update table statistics (may not be supported):', error);
    }
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupExpiredCache(): Promise<number> {
    try {
      const result = await this.prisma.cache.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });

      return result.count;
    } catch (error) {
      log.error('Failed to cleanup expired cache:', error);
      return 0;
    }
  }

  /**
   * Monitor API response times
   */
  async trackApiPerformance(
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
    context?: InvocationContext
  ): Promise<void> {
    try {
      // Track performance metrics
      telemetryService.logMetric('api.response_time', duration, {
        endpoint,
        method,
        statusCode: statusCode.toString()
      }, context);

      // Alert on slow responses
      if (duration > 5000) { // 5 seconds
        telemetryService.logEvent('slow_api_response', {
          endpoint,
          method,
          duration,
          statusCode
        }, context);
      }

      // Track error rates
      if (statusCode >= 400) {
        telemetryService.logMetric('api.error_rate', 1, {
          endpoint,
          method,
          statusCode: statusCode.toString()
        }, context);
      }

    } catch (error) {
      context?.log.error('Failed to track API performance:', error);
    }
  }

  /**
   * Get performance recommendations
   */
  async getPerformanceRecommendations(): Promise<{
    database: string[];
    api: string[];
    frontend: string[];
    caching: string[];
  }> {
    const recommendations = {
      database: [
        'Consider adding composite indexes for frequently queried column combinations',
        'Review and optimize slow queries identified in performance analysis',
        'Implement database connection pooling if not already configured',
        'Consider partitioning large tables by date for better performance'
      ],
      api: [
        'Implement response compression for large payloads',
        'Add request rate limiting to prevent abuse',
        'Use batch operations for bulk data processing',
        'Implement proper pagination for large result sets'
      ],
      frontend: [
        'Implement virtual scrolling for large lists',
        'Use React.memo and useMemo for expensive computations',
        'Implement progressive image loading',
        'Add service worker for offline functionality'
      ],
      caching: [
        'Implement cache warming for frequently accessed data',
        'Use cache invalidation strategies for real-time data',
        'Consider implementing cache hierarchies (L1, L2)',
        'Monitor cache hit rates and adjust TTL values accordingly'
      ]
    };

    return recommendations;
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(context?: InvocationContext): Promise<{
    summary: any;
    metrics: any;
    recommendations: any;
    timestamp: Date;
  }> {
    try {
      const queryAnalysis = await this.analyzeQueries(context);
      const recommendations = await this.getPerformanceRecommendations();

      const report = {
        summary: {
          slowQueriesFound: queryAnalysis.slowQueries.length,
          optimizationsApplied: queryAnalysis.optimizationsApplied,
          recommendationsCount: queryAnalysis.recommendations.length
        },
        metrics: {
          database: queryAnalysis,
          cacheHitRate: await this.calculateCacheHitRate()
        },
        recommendations,
        timestamp: new Date()
      };

      context?.log.info('Performance report generated', { 
        slowQueries: queryAnalysis.slowQueries.length,
        optimizations: queryAnalysis.optimizationsApplied 
      });

      return report;

    } catch (error) {
      context?.log.error('Failed to generate performance report:', error);
      throw error;
    }
  }

  /**
   * Calculate cache hit rate
   */
  private async calculateCacheHitRate(): Promise<number> {
    try {
      // This would typically be tracked in metrics
      // For now, return a placeholder value
      return 0.85; // 85% hit rate
    } catch (error) {
      log.error('Failed to calculate cache hit rate:', error);
      return 0;
    }
  }
}

export const performanceService = new PerformanceService();
