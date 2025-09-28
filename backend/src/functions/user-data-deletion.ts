import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { SecurityMiddleware, RATE_LIMIT_CONFIGS } from '../middleware/security.middleware';
import { DataProtectionService } from '../services/data-protection.service';
import { SecurityService } from '../services/security.service';
import { authenticateUser } from '../middleware/auth.middleware';

export async function userDataDeletion(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const securityMiddleware = new SecurityMiddleware();
  const dataProtectionService = new DataProtectionService();
  const securityService = new SecurityService();

  try {
    // Apply security middleware
    const securityResult = await securityMiddleware.apply(request, context, {
      rateLimit: RATE_LIMIT_CONFIGS.GENERAL,
      requireHttps: true,
      validateInput: true,
      auditLog: true
    });

    if (securityResult) {
      return securityResult;
    }

    const method = request.method.toLowerCase();
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = request.headers.get('user-agent');

    if (method === 'post') {
      // Request data deletion
      const body = await request.json() as {
        userId?: string;
        email?: string;
        reason: string;
        confirmDeletion: boolean;
      };

      // Validate required fields
      if (!body.reason || !body.confirmDeletion) {
        return SecurityMiddleware.addSecurityHeaders({
          status: 400,
          jsonBody: {
            error: 'Reason and confirmation are required for data deletion'
          }
        });
      }

      // If userId is provided, authenticate the user
      let userId = body.userId;
      if (userId) {
        const authResult = await authenticateUser(request, context);
        if (!authResult.success || authResult.user?.id !== userId) {
          await securityService.logSecurityEvent(
            'UNAUTHORIZED_DATA_DELETION_REQUEST',
            'user_data',
            clientIp,
            false,
            userId,
            userAgent,
            { reason: body.reason },
            context
          );

          return SecurityMiddleware.addSecurityHeaders({
            status: 401,
            jsonBody: { error: 'Unauthorized' }
          });
        }
      } else if (body.email) {
        // Find user by email (for users who don't have their userId)
        const user = await dataProtectionService['prisma'].user.findUnique({
          where: { email: body.email }
        });

        if (!user) {
          return SecurityMiddleware.addSecurityHeaders({
            status: 404,
            jsonBody: { error: 'User not found' }
          });
        }

        userId = user.id;
      } else {
        return SecurityMiddleware.addSecurityHeaders({
          status: 400,
          jsonBody: { error: 'Either userId or email must be provided' }
        });
      }

      // Process data deletion request
      await dataProtectionService.deleteUserData({
        userId,
        reason: body.reason,
        requestedBy: userId,
        requestedAt: new Date()
      }, context);

      await securityService.logSecurityEvent(
        'USER_DATA_DELETED',
        'user_data',
        clientIp,
        true,
        userId,
        userAgent,
        { reason: body.reason },
        context
      );

      return SecurityMiddleware.addSecurityHeaders({
        status: 200,
        jsonBody: {
          success: true,
          message: 'User data has been successfully deleted',
          deletedAt: new Date().toISOString()
        }
      });

    } else if (method === 'get') {
      // Get data retention summary
      const url = new URL(request.url);
      const userId = url.searchParams.get('userId');

      if (!userId) {
        return SecurityMiddleware.addSecurityHeaders({
          status: 400,
          jsonBody: { error: 'userId parameter is required' }
        });
      }

      // Authenticate the user
      const authResult = await authenticateUser(request, context);
      if (!authResult.success || authResult.user?.id !== userId) {
        return SecurityMiddleware.addSecurityHeaders({
          status: 401,
          jsonBody: { error: 'Unauthorized' }
        });
      }

      const summary = await dataProtectionService.getDataRetentionSummary(userId);

      return SecurityMiddleware.addSecurityHeaders({
        status: 200,
        jsonBody: summary
      });

    } else {
      return SecurityMiddleware.addSecurityHeaders({
        status: 405,
        jsonBody: { error: 'Method not allowed' }
      });
    }

  } catch (error) {
    context.error('User data deletion error:', error);

    await securityService.logSecurityEvent(
      'DATA_DELETION_ERROR',
      'user_data',
      'unknown',
      false,
      undefined,
      undefined,
      { error: error.message },
      context
    );

    return SecurityMiddleware.addSecurityHeaders({
      status: 500,
      jsonBody: { error: 'Internal server error' }
    });
  }
}

app.http('user-data-deletion', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: userDataDeletion,
});