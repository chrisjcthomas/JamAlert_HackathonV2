import { InvocationContext } from '@azure/functions';
import { PrismaClient } from '@prisma/client';
import { getDatabase } from '../lib/database';
import { SecurityService } from './security.service';

export interface DataDeletionRequest {
  userId: string;
  reason: string;
  requestedBy: string;
  requestedAt: Date;
}

export interface DataExportRequest {
  userId: string;
  requestedBy: string;
  includePersonalData: boolean;
  includeActivityData: boolean;
  includeAlertHistory: boolean;
}

export interface UserDataExport {
  personalData: any;
  activityData: any;
  alertHistory: any;
  exportedAt: Date;
  exportedBy: string;
}

export class DataProtectionService {
  private prisma: PrismaClient;
  private securityService: SecurityService;

  constructor() {
    this.prisma = getDatabase();
    this.securityService = new SecurityService();
  }

  /**
   * Export all user data for privacy compliance (GDPR-style)
   */
  async exportUserData(
    request: DataExportRequest,
    context?: InvocationContext
  ): Promise<UserDataExport> {
    try {
      await this.securityService.logSecurityEvent(
        'DATA_EXPORT_REQUEST',
        'user_data',
        'system',
        true,
        request.userId,
        undefined,
        { requestedBy: request.requestedBy, includePersonalData: request.includePersonalData },
        context
      );

      const exportData: UserDataExport = {
        personalData: null,
        activityData: null,
        alertHistory: null,
        exportedAt: new Date(),
        exportedBy: request.requestedBy
      };

      // Export personal data
      if (request.includePersonalData) {
        const user = await this.prisma.user.findUnique({
          where: { id: request.userId },
          include: {
            deactivations: true
          }
        });

        if (user) {
          exportData.personalData = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            parish: user.parish,
            address: user.address,
            preferences: {
              smsAlerts: user.smsAlerts,
              emailAlerts: user.emailAlerts,
              emergencyOnly: user.emergencyOnly,
              accessibilitySettings: user.accessibilitySettings
            },
            accountInfo: {
              createdAt: user.createdAt,
              updatedAt: user.updatedAt,
              isActive: user.isActive
            },
            deactivations: user.deactivations
          };
        }
      }

      // Export activity data
      if (request.includeActivityData) {
        const [incidentReports, alertFeedback, sessions] = await Promise.all([
          this.prisma.incidentReport.findMany({
            where: {
              OR: [
                { reporterName: { contains: request.userId } },
                { reporterPhone: { contains: request.userId } }
              ]
            }
          }),
          this.prisma.alertFeedback.findMany({
            where: { userId: request.userId }
          }),
          this.prisma.userSession.findMany({
            where: { userId: request.userId }
          })
        ]);

        exportData.activityData = {
          incidentReports: incidentReports.map(report => ({
            id: report.id,
            type: report.incidentType,
            severity: report.severity,
            parish: report.parish,
            description: report.description,
            date: report.incidentDate,
            status: report.status,
            createdAt: report.createdAt
          })),
          alertFeedback: alertFeedback.map(feedback => ({
            alertId: feedback.alertId,
            rating: feedback.rating,
            comment: feedback.comment,
            wasAccurate: feedback.wasAccurate,
            wasHelpful: feedback.wasHelpful,
            createdAt: feedback.createdAt
          })),
          sessions: sessions.map(session => ({
            sessionId: session.sessionId,
            ipAddress: session.ipAddress,
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            isActive: session.isActive
          }))
        };
      }

      // Export alert history
      if (request.includeAlertHistory) {
        const alertDeliveryLogs = await this.prisma.alertDeliveryLog.findMany({
          where: { userId: request.userId },
          include: {
            alert: {
              select: {
                id: true,
                type: true,
                severity: true,
                title: true,
                message: true,
                createdAt: true
              }
            }
          },
          orderBy: { sentAt: 'desc' }
        });

        exportData.alertHistory = alertDeliveryLogs.map(log => ({
          alertId: log.alertId,
          alert: log.alert,
          deliveryMethod: log.deliveryMethod,
          status: log.status,
          sentAt: log.sentAt,
          deliveredAt: log.deliveredAt,
          errorMessage: log.errorMessage
        }));
      }

      await this.securityService.logSecurityEvent(
        'DATA_EXPORT_COMPLETED',
        'user_data',
        'system',
        true,
        request.userId,
        undefined,
        { requestedBy: request.requestedBy, dataSize: JSON.stringify(exportData).length },
        context
      );

      return exportData;
    } catch (error) {
      await this.securityService.logSecurityEvent(
        'DATA_EXPORT_FAILED',
        'user_data',
        'system',
        false,
        request.userId,
        undefined,
        { requestedBy: request.requestedBy, error: error.message },
        context
      );
      throw error;
    }
  }

  /**
   * Delete all user data for privacy compliance
   */
  async deleteUserData(
    request: DataDeletionRequest,
    context?: InvocationContext
  ): Promise<void> {
    try {
      await this.securityService.logSecurityEvent(
        'DATA_DELETION_REQUEST',
        'user_data',
        'system',
        true,
        request.userId,
        undefined,
        { 
          reason: request.reason,
          requestedBy: request.requestedBy,
          requestedAt: request.requestedAt
        },
        context
      );

      // Perform deletion in a transaction to ensure data consistency
      await this.prisma.$transaction(async (tx) => {
        // 1. Delete alert delivery logs
        await tx.alertDeliveryLog.deleteMany({
          where: { userId: request.userId }
        });

        // 2. Delete alert feedback
        await tx.alertFeedback.deleteMany({
          where: { userId: request.userId }
        });

        // 3. Delete user sessions
        await tx.userSession.deleteMany({
          where: { userId: request.userId }
        });

        // 4. Delete user deactivation records
        await tx.userDeactivation.deleteMany({
          where: { userId: request.userId }
        });

        // 5. Anonymize incident reports instead of deleting (for safety records)
        const userIncidentReports = await tx.incidentReport.findMany({
          where: {
            OR: [
              { reporterName: { not: null } },
              { reporterPhone: { not: null } }
            ]
          }
        });

        for (const report of userIncidentReports) {
          // Check if this report might belong to the user
          const belongsToUser = 
            (report.reporterName && report.reporterName.includes(request.userId)) ||
            (report.reporterPhone && report.reporterPhone.includes(request.userId));

          if (belongsToUser) {
            await tx.incidentReport.update({
              where: { id: report.id },
              data: {
                reporterName: null,
                reporterPhone: null,
                isAnonymous: true,
                receiveUpdates: false
              }
            });
          }
        }

        // 6. Finally, delete the user record
        await tx.user.delete({
          where: { id: request.userId }
        });

        // 7. Log the deletion in user deactivations for audit purposes
        await tx.userDeactivation.create({
          data: {
            id: crypto.randomUUID(),
            userId: request.userId,
            reason: `Data deletion: ${request.reason}`,
            feedback: `Requested by: ${request.requestedBy}`,
            deactivatedAt: new Date()
          }
        });
      });

      await this.securityService.logSecurityEvent(
        'DATA_DELETION_COMPLETED',
        'user_data',
        'system',
        true,
        request.userId,
        undefined,
        { 
          reason: request.reason,
          requestedBy: request.requestedBy,
          completedAt: new Date()
        },
        context
      );
    } catch (error) {
      await this.securityService.logSecurityEvent(
        'DATA_DELETION_FAILED',
        'user_data',
        'system',
        false,
        request.userId,
        undefined,
        { 
          reason: request.reason,
          requestedBy: request.requestedBy,
          error: error.message
        },
        context
      );
      throw error;
    }
  }

  /**
   * Anonymize user data while preserving statistical value
   */
  async anonymizeUserData(
    userId: string,
    context?: InvocationContext
  ): Promise<void> {
    try {
      await this.securityService.logSecurityEvent(
        'DATA_ANONYMIZATION_REQUEST',
        'user_data',
        'system',
        true,
        userId,
        undefined,
        { userId },
        context
      );

      await this.prisma.$transaction(async (tx) => {
        // Generate anonymous identifier
        const anonymousId = `anon_${crypto.randomUUID().substring(0, 8)}`;

        // Update user record with anonymized data
        await tx.user.update({
          where: { id: userId },
          data: {
            firstName: 'Anonymous',
            lastName: 'User',
            email: `${anonymousId}@anonymized.local`,
            phone: null,
            address: null,
            accessibilitySettings: null,
            isActive: false
          }
        });

        // Anonymize incident reports
        await tx.incidentReport.updateMany({
          where: {
            OR: [
              { reporterName: { contains: userId } },
              { reporterPhone: { contains: userId } }
            ]
          },
          data: {
            reporterName: null,
            reporterPhone: null,
            isAnonymous: true,
            receiveUpdates: false
          }
        });

        // Keep alert delivery logs for statistics but remove personal identifiers
        // (The userId foreign key will still exist but the user data is anonymized)
      });

      await this.securityService.logSecurityEvent(
        'DATA_ANONYMIZATION_COMPLETED',
        'user_data',
        'system',
        true,
        userId,
        undefined,
        { userId, anonymizedAt: new Date() },
        context
      );
    } catch (error) {
      await this.securityService.logSecurityEvent(
        'DATA_ANONYMIZATION_FAILED',
        'user_data',
        'system',
        false,
        userId,
        undefined,
        { userId, error: error.message },
        context
      );
      throw error;
    }
  }

  /**
   * Clean up expired data automatically
   */
  async cleanupExpiredData(context?: InvocationContext): Promise<void> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      await this.securityService.logSecurityEvent(
        'DATA_CLEANUP_STARTED',
        'system_data',
        'system',
        true,
        undefined,
        undefined,
        { thirtyDaysAgo, oneYearAgo },
        context
      );

      await this.prisma.$transaction(async (tx) => {
        // Clean up expired user sessions
        const expiredSessions = await tx.userSession.deleteMany({
          where: {
            OR: [
              { expiresAt: { lt: now } },
              { isActive: false, createdAt: { lt: thirtyDaysAgo } }
            ]
          }
        });

        // Archive old security audit logs (keep for 1 year)
        const oldAuditLogs = await tx.securityAuditLog.deleteMany({
          where: {
            timestamp: { lt: oneYearAgo }
          }
        });

        // Clean up old alert delivery logs (keep for 6 months)
        const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);
        const oldDeliveryLogs = await tx.alertDeliveryLog.deleteMany({
          where: {
            sentAt: { lt: sixMonthsAgo }
          }
        });

        context?.log(`Data cleanup completed: ${expiredSessions.count} sessions, ${oldAuditLogs.count} audit logs, ${oldDeliveryLogs.count} delivery logs`);
      });

      await this.securityService.logSecurityEvent(
        'DATA_CLEANUP_COMPLETED',
        'system_data',
        'system',
        true,
        undefined,
        undefined,
        { completedAt: new Date() },
        context
      );
    } catch (error) {
      await this.securityService.logSecurityEvent(
        'DATA_CLEANUP_FAILED',
        'system_data',
        'system',
        false,
        undefined,
        undefined,
        { error: error.message },
        context
      );
      throw error;
    }
  }

  /**
   * Get data retention summary for a user
   */
  async getDataRetentionSummary(userId: string): Promise<any> {
    const [user, alertLogs, feedback, sessions, incidents] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.alertDeliveryLog.count({ where: { userId } }),
      this.prisma.alertFeedback.count({ where: { userId } }),
      this.prisma.userSession.count({ where: { userId, isActive: true } }),
      this.prisma.incidentReport.count({
        where: {
          OR: [
            { reporterName: { contains: userId } },
            { reporterPhone: { contains: userId } }
          ]
        }
      })
    ]);

    return {
      user: user ? {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        isActive: user.isActive
      } : null,
      dataPoints: {
        alertDeliveryLogs: alertLogs,
        alertFeedback: feedback,
        activeSessions: sessions,
        incidentReports: incidents
      },
      retentionPolicies: {
        personalData: 'Retained until account deletion',
        alertHistory: 'Retained for 6 months',
        auditLogs: 'Retained for 1 year',
        sessions: 'Expired sessions deleted after 30 days'
      }
    };
  }
}