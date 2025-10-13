// @ts-nocheck
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { performanceService } from '../services/performance.service';
import { monitoringService } from '../services/monitoring.service';
import { withRetry } from '../lib/database';

/**
 * Performance monitoring and optimization endpoint
 */
async function performanceMonitor(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'report';

    switch (action) {
      case 'report':
        return await generatePerformanceReport(context);
      
      case 'analyze':
        return await analyzePerformance(context);
      
      case 'optimize':
        return await optimizePerformance(context);
      
      case 'recommendations':
        return await getRecommendations(context);
      
      default:
        return {
          status: 400,
          jsonBody: {
            success: false,
            error: 'Invalid action. Supported actions: report, analyze, optimize, recommendations'
          }
        };
    }

  } catch (error) {
    context.error('Performance monitor error:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

/**
 * Generate comprehensive performance report
 */
async function generatePerformanceReport(context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const report = await withRetry(async () => {
      return await performanceService.generatePerformanceReport(context);
    }, 'Generate performance report');

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: {
        success: true,
        data: report,
        message: 'Performance report generated successfully'
      }
    };

  } catch (error) {
    context.error('Failed to generate performance report:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: 'Failed to generate performance report'
      }
    };
  }
}

/**
 * Analyze current performance metrics
 */
async function analyzePerformance(context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const analysis = await withRetry(async () => {
      return await performanceService.analyzeQueries(context);
    }, 'Analyze performance');

    // Get additional metrics from monitoring service
    const healthMetrics = await monitoringService.getSystemHealth(context);
    const performanceMetrics = await monitoringService.collectPerformanceMetrics(context);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: {
        success: true,
        data: {
          queryAnalysis: analysis,
          systemHealth: healthMetrics,
          performanceMetrics: performanceMetrics
        },
        message: 'Performance analysis completed'
      }
    };

  } catch (error) {
    context.error('Failed to analyze performance:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: 'Failed to analyze performance'
      }
    };
  }
}

/**
 * Run performance optimizations
 */
async function optimizePerformance(context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const optimizations = await withRetry(async () => {
      return await performanceService.analyzeQueries(context);
    }, 'Run performance optimizations');

    // Run additional optimizations
    await monitoringService.optimizeDatabaseQueries(context);

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: {
        success: true,
        data: {
          optimizationsApplied: optimizations.optimizationsApplied,
          recommendations: optimizations.recommendations
        },
        message: `Applied ${optimizations.optimizationsApplied} performance optimizations`
      }
    };

  } catch (error) {
    context.error('Failed to run performance optimizations:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: 'Failed to run performance optimizations'
      }
    };
  }
}

/**
 * Get performance recommendations
 */
async function getRecommendations(context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const recommendations = await performanceService.getPerformanceRecommendations();

    return {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      jsonBody: {
        success: true,
        data: recommendations,
        message: 'Performance recommendations retrieved successfully'
      }
    };

  } catch (error) {
    context.error('Failed to get performance recommendations:', error);
    return {
      status: 500,
      jsonBody: {
        success: false,
        error: 'Failed to get performance recommendations'
      }
    };
  }
}

// Register the function
app.http('performance-monitor', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  route: 'admin/performance',
  handler: performanceMonitor
});
