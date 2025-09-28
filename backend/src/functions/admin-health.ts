import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticateAdmin } from '../middleware/auth.middleware';
import { monitoringService } from '../services/monitoring.service';

export async function adminHealth(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  try {
    // Authenticate admin user
    const admin = await authenticateAdmin(request, context);
    if (!admin) {
      return {
        status: 401,
        jsonBody: { error: 'Unauthorized' }
      };
    }

    const method = request.method.toUpperCase();

    if (method === 'GET') {
      // Get system health status
      const health = await monitoringService.checkSystemHealth(context);
      
      return {
        status: 200,
        jsonBody: health
      };
    }

    if (method === 'POST') {
      // Get detailed metrics
      const body = await request.json() as { type?: string };
      
      if (body.type === 'performance') {
        const metrics = await monitoringService.collectPerformanceMetrics(context);
        return {
          status: 200,
          jsonBody: metrics
        };
      }
      
      if (body.type === 'usage') {
        const usage = await monitoringService.collectUsageMetrics(context);
        return {
          status: 200,
          jsonBody: usage
        };
      }

      if (body.type === 'cleanup') {
        await monitoringService.cleanupOldData(context);
        return {
          status: 200,
          jsonBody: { message: 'Cleanup completed successfully' }
        };
      }

      if (body.type === 'optimize') {
        await monitoringService.optimizeDatabaseQueries(context);
        return {
          status: 200,
          jsonBody: { message: 'Database optimization completed' }
        };
      }

      return {
        status: 400,
        jsonBody: { error: 'Invalid request type. Use: performance, usage, cleanup, or optimize' }
      };
    }

    return {
      status: 405,
      jsonBody: { error: 'Method not allowed' }
    };

  } catch (error) {
    (context.log as any).error('Admin health check failed:', error);
    
    return {
      status: 500,
      jsonBody: { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}

app.http('admin-health', {
  methods: ['GET', 'POST'],
  authLevel: 'function',
  route: 'admin/health',
  handler: adminHealth
});