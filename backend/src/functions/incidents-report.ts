import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { IncidentService } from '../services/incident.service';
import { IncidentReportRequest, ApiResponse } from '../types';
import { ValidationService } from '../services/validation.service';
import { SecurityMiddleware, RATE_LIMIT_CONFIGS } from '../middleware/security.middleware';
import { SecurityService } from '../services/security.service';

const incidentService = new IncidentService();
const validationService = new ValidationService();

export async function incidentsReport(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('Processing incident report request');
  
  const securityMiddleware = new SecurityMiddleware();
  const securityService = new SecurityService();

  try {
    // Apply security middleware with rate limiting for incident reports
    const securityResult = await securityMiddleware.apply(request, context, {
      rateLimit: RATE_LIMIT_CONFIGS.INCIDENT_REPORT,
      requireHttps: true,
      validateInput: true,
      auditLog: true
    });

    if (securityResult) {
      return securityResult;
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return SecurityMiddleware.addSecurityHeaders({
        status: 405,
        jsonBody: {
          success: false,
          error: 'Method not allowed'
        }
      });
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = request.headers.get('user-agent');

    // Get request body
    const body = await request.json() as IncidentReportRequest;
    
    if (!body) {
      return SecurityMiddleware.addSecurityHeaders({
        status: 400,
        jsonBody: {
          success: false,
          error: 'Request body is required'
        }
      });
    }

    // Sanitize input data
    const sanitizedData: IncidentReportRequest = {
      incidentType: body.incidentType,
      severity: body.severity,
      parish: body.parish,
      community: body.community ? validationService.sanitizeText(body.community) : undefined,
      address: body.address ? validationService.sanitizeAddress(body.address) : undefined,
      description: validationService.sanitizeText(body.description),
      incidentDate: new Date(body.incidentDate),
      incidentTime: body.incidentTime ? validationService.sanitizeText(body.incidentTime) : undefined,
      reporterName: body.reporterName && !body.isAnonymous ? 
        validationService.sanitizeName(body.reporterName) : undefined,
      reporterPhone: body.reporterPhone && !body.isAnonymous ? 
        validationService.sanitizePhoneNumber(body.reporterPhone) : undefined,
      isAnonymous: Boolean(body.isAnonymous),
      receiveUpdates: Boolean(body.receiveUpdates) && !body.isAnonymous,
      latitude: body.latitude ? Number(body.latitude) : undefined,
      longitude: body.longitude ? Number(body.longitude) : undefined
    };

    // Additional validation for incident date (can't be in the future)
    const now = new Date();
    const maxPastDate = new Date();
    maxPastDate.setDate(maxPastDate.getDate() - 30); // Max 30 days in the past

    if (sanitizedData.incidentDate > now) {
      await securityService.logSecurityEvent(
        'INVALID_INCIDENT_DATE_FUTURE',
        'incident_report',
        clientIp,
        false,
        undefined,
        userAgent,
        { incidentDate: sanitizedData.incidentDate },
        context
      );

      return SecurityMiddleware.addSecurityHeaders({
        status: 400,
        jsonBody: {
          success: false,
          error: 'Incident date cannot be in the future'
        }
      });
    }

    if (sanitizedData.incidentDate < maxPastDate) {
      await securityService.logSecurityEvent(
        'INVALID_INCIDENT_DATE_TOO_OLD',
        'incident_report',
        clientIp,
        false,
        undefined,
        userAgent,
        { incidentDate: sanitizedData.incidentDate },
        context
      );

      return SecurityMiddleware.addSecurityHeaders({
        status: 400,
        jsonBody: {
          success: false,
          error: 'Incident date cannot be more than 30 days in the past'
        }
      });
    }

    // Validate incident time format if provided
    if (sanitizedData.incidentTime) {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(sanitizedData.incidentTime)) {
        return SecurityMiddleware.addSecurityHeaders({
          status: 400,
          jsonBody: {
            success: false,
            error: 'Invalid time format. Use HH:MM format (24-hour)'
          }
        });
      }
    }

    // Validate reporter contact info for non-anonymous reports
    if (!sanitizedData.isAnonymous && sanitizedData.receiveUpdates) {
      if (!sanitizedData.reporterName || sanitizedData.reporterName.trim().length < 2) {
        return SecurityMiddleware.addSecurityHeaders({
          status: 400,
          jsonBody: {
            success: false,
            error: 'Reporter name is required for non-anonymous reports with updates'
          }
        });
      }

      if (sanitizedData.reporterPhone && !validationService.sanitizePhoneNumber(sanitizedData.reporterPhone)) {
        return SecurityMiddleware.addSecurityHeaders({
          status: 400,
          jsonBody: {
            success: false,
            error: 'Invalid phone number format'
          }
        });
      }
    }

    // Create the incident report
    const result = await incidentService.createIncidentReport(sanitizedData);

    if (!result.success) {
      context.error('Failed to create incident report:', result.error);
      
      await securityService.logSecurityEvent(
        'INCIDENT_REPORT_CREATION_FAILED',
        'incident_report',
        clientIp,
        false,
        undefined,
        userAgent,
        { error: result.error, parish: sanitizedData.parish },
        context
      );

      return SecurityMiddleware.addSecurityHeaders({
        status: 400,
        jsonBody: result
      });
    }

    // Log successful creation (without sensitive data)
    await securityService.logSecurityEvent(
      'INCIDENT_REPORT_CREATED',
      'incident_report',
      clientIp,
      true,
      undefined,
      userAgent,
      {
        reportId: result.data?.id,
        parish: sanitizedData.parish,
        incidentType: sanitizedData.incidentType,
        severity: sanitizedData.severity,
        isAnonymous: sanitizedData.isAnonymous
      },
      context
    );

    context.info('Incident report created successfully', {
      reportId: result.data?.id,
      parish: sanitizedData.parish,
      incidentType: sanitizedData.incidentType,
      severity: sanitizedData.severity,
      isAnonymous: sanitizedData.isAnonymous
    });

    // Return success response (exclude sensitive data)
    const responseData = {
      id: result.data?.id,
      status: result.data?.status,
      parish: result.data?.parish,
      incidentType: result.data?.incidentType,
      severity: result.data?.severity,
      createdAt: result.data?.createdAt
    };

    return SecurityMiddleware.addSecurityHeaders({
      status: 201,
      jsonBody: {
        success: true,
        data: responseData,
        message: 'Incident report submitted successfully. It will be reviewed by our team.'
      }
    });

  } catch (error) {
    context.error('Error processing incident report:', error);
    
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = request.headers.get('user-agent');

    await securityService.logSecurityEvent(
      'INCIDENT_REPORT_ERROR',
      'incident_report',
      clientIp,
      false,
      undefined,
      userAgent,
      { error: error.message },
      context
    );
    
    return SecurityMiddleware.addSecurityHeaders({
      status: 500,
      jsonBody: {
        success: false,
        error: 'Internal server error'
      }
    });
  }
}

// Register the function
app.http('incidents-report', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'incidents/report',
  handler: incidentsReport
});