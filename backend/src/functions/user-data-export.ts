import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { SecurityMiddleware, RATE_LIMIT_CONFIGS } from '../middleware/security.middleware';
import { DataProtectionService } from '../services/data-protection.service';
import { SecurityService } from '../services/security.service';
import { authenticateUser } from '../middleware/auth.middleware';

export async function userDataExport(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const securityMiddleware = new SecurityMiddleware();
  const dataProtectionService = new DataProtectionService();
  const securityService = new SecurityService();

  try {
    // Apply security middleware with stricter rate limiting for data export
    const securityResult = await securityMiddleware.apply(request, context, {
      rateLimit: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 3 // Only 3 data export requests per hour
      },
      requireHttps: true,
      validateInput: true,
      auditLog: true
    });

    if (securityResult) {
      return securityResult;
    }

    if (request.method.toLowerCase() !== 'post') {
      return SecurityMiddleware.addSecurityHeaders({
        status: 405,
        jsonBody: { error: 'Method not allowed' }
      });
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = request.headers.get('user-agent');

    const body = await request.json() as {
      userId: string;
      includePersonalData?: boolean;
      includeActivityData?: boolean;
      includeAlertHistory?: boolean;
    };

    // Validate required fields
    if (!body.userId) {
      return SecurityMiddleware.addSecurityHeaders({
        status: 400,
        jsonBody: { error: 'userId is required' }
      });
    }

    // Authenticate the user
    const authResult = await authenticateUser(request, context);
    if (!authResult.success || authResult.user?.id !== body.userId) {
      await securityService.logSecurityEvent(
        'UNAUTHORIZED_DATA_EXPORT_REQUEST',
        'user_data',
        clientIp,
        false,
        body.userId,
        userAgent,
        { requestedData: Object.keys(body).filter(k => body[k] === true) },
        context
      );

      return SecurityMiddleware.addSecurityHeaders({
        status: 401,
        jsonBody: { error: 'Unauthorized' }
      });
    }

    // Default to including all data if not specified
    const exportRequest = {
      userId: body.userId,
      requestedBy: body.userId,
      includePersonalData: body.includePersonalData !== false,
      includeActivityData: body.includeActivityData !== false,
      includeAlertHistory: body.includeAlertHistory !== false
    };

    // Export user data
    const exportData = await dataProtectionService.exportUserData(exportRequest, context);

    await securityService.logSecurityEvent(
      'USER_DATA_EXPORTED',
      'user_data',
      clientIp,
      true,
      body.userId,
      userAgent,
      { 
        includePersonalData: exportRequest.includePersonalData,
        includeActivityData: exportRequest.includeActivityData,
        includeAlertHistory: exportRequest.includeAlertHistory,
        dataSize: JSON.stringify(exportData).length
      },
      context
    );

    return SecurityMiddleware.addSecurityHeaders({
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="jamalert-data-export-${body.userId}-${new Date().toISOString().split('T')[0]}.json"`
      },
      jsonBody: exportData
    });

  } catch (error) {
    context.log.error('User data export error:', error);

    await securityService.logSecurityEvent(
      'DATA_EXPORT_ERROR',
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

app.http('user-data-export', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: userDataExport,
});