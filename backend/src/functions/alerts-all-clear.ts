import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { authenticateAdmin } from '../middleware/auth.middleware';
import { NotificationService } from '../services/notification.service';
import { UserService } from '../services/user.service';
import { AlertService } from '../services/alert.service';
import { ApiResponse, Parish } from '../types';

// Request validation schema
const allClearRequestSchema = z.object({
  originalAlertId: z.string().min(1, 'Original alert ID is required'),
  parishes: z.array(z.nativeEnum(Parish)).min(1, 'At least one parish is required'),
  message: z.string().min(10, 'Clearance message must be at least 10 characters'),
  sendToAllUsers: z.boolean().default(false)
});

type AllClearRequest = z.infer<typeof allClearRequestSchema>;

/**
 * Azure Function to send "all clear" notifications for resolved incidents
 */
export async function alertsAllClear(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log('Processing all clear notification request');

  try {
    // Authenticate admin user
    const admin = await authenticateAdmin(request, context);
    if (!admin) {
      return {
        status: 401,
        jsonBody: {
          success: false,
          error: 'Authentication required'
        } as ApiResponse
      };
    }

    // Parse and validate request body
    const body = await request.json() as AllClearRequest;
    const validatedData = allClearRequestSchema.parse(body);

    context.log(`Admin ${admin.user.email} sending all clear for alert ${validatedData.originalAlertId}`);

    // Initialize services
    const notificationService = new NotificationService();
    const userService = new UserService();
    const alertService = new AlertService();

    try {
      // Get original alert
      const originalAlert = await alertService.getAlertById(validatedData.originalAlertId);
      if (!originalAlert) {
        return {
          status: 404,
          jsonBody: {
            success: false,
            error: 'Original alert not found'
          } as ApiResponse
        };
      }

      // Get users to notify
      let users;
      if (validatedData.sendToAllUsers) {
        // Send to all users in affected parishes
        users = await userService.getUsersByParishes(validatedData.parishes);
      } else {
        // Send only to users who received the original alert
        users = await userService.getUsersWhoReceivedAlert(validatedData.originalAlertId);
      }

      if (users.length === 0) {
        return {
          status: 400,
          jsonBody: {
            success: false,
            error: 'No users found to notify'
          } as ApiResponse
        };
      }

      context.log(`Sending all clear notification to ${users.length} users`);

      // Send all clear notifications
      const result = await notificationService.sendAllClearNotification(
        users,
        originalAlert,
        validatedData.message
      );

      // Log the all clear action
      await alertService.logAdminAction(admin.user.id, 'SEND_ALL_CLEAR', 'alert', originalAlert.id, {
        parishes: validatedData.parishes,
        recipientCount: users.length,
        message: validatedData.message
      });

      context.log(`All clear notification completed: ${result.successCount}/${result.totalRecipients} successful`);

      return {
        status: 200,
        jsonBody: {
          success: true,
          data: {
            alertId: `clear-${originalAlert.id}`,
            recipientCount: result.totalRecipients,
            successCount: result.successCount,
            failureCount: result.failureCount,
            deliveryStats: result.deliveryStats
          }
        } as ApiResponse
      };

    } finally {
      await notificationService.close();
    }

  } catch (error) {
    (context.log as any).error('All clear notification failed:', error);

    if (error instanceof z.ZodError) {
      return {
        status: 400,
        jsonBody: {
          success: false,
          error: 'Invalid request data',
          details: error.errors
        } as ApiResponse
      };
    }

    return {
      status: 500,
      jsonBody: {
        success: false,
        error: 'Failed to send all clear notification'
      } as ApiResponse
    };
  }
}

// Register the function
app.http('alerts-all-clear', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'alerts/all-clear',
  handler: alertsAllClear,
});