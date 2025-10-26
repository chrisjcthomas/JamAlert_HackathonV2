import { User, Alert, AlertDeliveryLog, DeliveryMethod, DeliveryLogStatus, AlertType, Severity } from '@prisma/client';
import { getPrismaClient, withRetry } from '../lib/database';
import { EmailService } from './email.service';
import { SMSService } from './sms.service';
import { 
  EmailNotification, 
  PushNotification, 
  SMSNotification,
  NotificationPayload,
  MessageTemplate,
  NotificationTone,
  EmergencyContacts 
} from '../types';

export interface NotificationResult {
  success: boolean;
  deliveryMethod: DeliveryMethod;
  userId: string;
  error?: string;
  messageId?: string;
}

export interface BatchNotificationResult {
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  results: NotificationResult[];
  deliveryStats: {
    email: { sent: number; failed: number };
    sms: { sent: number; failed: number };
    push: { sent: number; failed: number };
  };
}

export class NotificationService {
  private emailService: EmailService;
  private smsService: SMSService;
  private prisma: ReturnType<typeof getPrismaClient>;
  private messageTemplates: Map<string, MessageTemplate>;
  private emergencyContacts: EmergencyContacts;

  constructor() {
    this.emailService = new EmailService();
    this.smsService = new SMSService();
    this.prisma = getPrismaClient();
    this.messageTemplates = this.initializeMessageTemplates();
    this.emergencyContacts = this.getEmergencyContacts();
  }

  /**
   * Initialize message templates for different alert types and tones
   */
  private initializeMessageTemplates(): Map<string, MessageTemplate> {
    const templates = new Map<string, MessageTemplate>();

    // Flood Alert Templates
    templates.set('FLOOD_HIGH_URGENT', {
      title: '🚨 URGENT FLOOD WARNING',
      emailSubject: 'URGENT: Severe Flooding Alert - {parishes}',
      emailTemplate: 'IMMEDIATE ACTION REQUIRED: Severe flooding is occurring in {parishes}. {message} Move to higher ground immediately. Avoid driving through flooded roads.',
      smsTemplate: 'URGENT FLOOD ALERT: {message} Move to higher ground NOW. Avoid flooded roads. Emergency: 119/911',
      pushTitle: 'URGENT: Severe Flood Warning',
      pushBody: '{message} Move to higher ground immediately.',
      tone: 'urgent' as NotificationTone
    });

    templates.set('FLOOD_HIGH_CALM', {
      title: '⚠️ Flood Warning',
      emailSubject: 'Important: Flood Warning for {parishes}',
      emailTemplate: 'A flood warning has been issued for {parishes}. {message} Please take precautionary measures and avoid low-lying areas.',
      smsTemplate: 'FLOOD WARNING: {message} Take precautions, avoid low areas. Info: 116',
      pushTitle: 'Flood Warning',
      pushBody: '{message} Please take precautionary measures.',
      tone: 'calm' as NotificationTone
    });

    templates.set('FLOOD_MEDIUM_URGENT', {
      title: '⚠️ FLOOD WATCH',
      emailSubject: 'Flood Watch Alert - {parishes}',
      emailTemplate: 'A flood watch is in effect for {parishes}. {message} Monitor conditions and be prepared to take action if necessary.',
      smsTemplate: 'FLOOD WATCH: {message} Monitor conditions. Stay alert. Info: 116',
      pushTitle: 'Flood Watch Alert',
      pushBody: '{message} Monitor conditions closely.',
      tone: 'urgent' as NotificationTone
    });

    templates.set('FLOOD_MEDIUM_CALM', {
      title: 'ℹ️ Flood Advisory',
      emailSubject: 'Flood Advisory - {parishes}',
      emailTemplate: 'A flood advisory has been issued for {parishes}. {message} Stay informed and avoid unnecessary travel to affected areas.',
      smsTemplate: 'FLOOD ADVISORY: {message} Stay informed. Avoid affected areas.',
      pushTitle: 'Flood Advisory',
      pushBody: '{message} Stay informed about conditions.',
      tone: 'calm' as NotificationTone
    });

    // Weather Alert Templates
    templates.set('WEATHER_HIGH_URGENT', {
      title: '🌪️ SEVERE WEATHER WARNING',
      emailSubject: 'URGENT: Severe Weather Alert - {parishes}',
      emailTemplate: 'SEVERE WEATHER WARNING for {parishes}. {message} Seek shelter immediately and avoid outdoor activities.',
      smsTemplate: 'SEVERE WEATHER: {message} Seek shelter NOW. Stay indoors. Emergency: 119/911',
      pushTitle: 'URGENT: Severe Weather',
      pushBody: '{message} Seek shelter immediately.',
      tone: 'urgent' as NotificationTone
    });

    templates.set('WEATHER_MEDIUM_CALM', {
      title: '🌦️ Weather Advisory',
      emailSubject: 'Weather Advisory - {parishes}',
      emailTemplate: 'A weather advisory is in effect for {parishes}. {message} Exercise caution and monitor weather conditions.',
      smsTemplate: 'WEATHER ADVISORY: {message} Exercise caution. Monitor conditions.',
      pushTitle: 'Weather Advisory',
      pushBody: '{message} Exercise caution outdoors.',
      tone: 'calm' as NotificationTone
    });

    // Emergency Alert Templates
    templates.set('EMERGENCY_HIGH_URGENT', {
      title: '🚨 EMERGENCY ALERT',
      emailSubject: 'EMERGENCY ALERT - {parishes}',
      emailTemplate: 'EMERGENCY ALERT for {parishes}. {message} Follow official instructions immediately.',
      smsTemplate: 'EMERGENCY: {message} Follow official instructions. Emergency: 119/911',
      pushTitle: 'EMERGENCY ALERT',
      pushBody: '{message} Follow official instructions.',
      tone: 'urgent' as NotificationTone
    });

    // All Clear Templates
    templates.set('ALL_CLEAR_LOW_CALM', {
      title: '✅ All Clear',
      emailSubject: 'All Clear - {parishes}',
      emailTemplate: 'The emergency situation in {parishes} has been resolved. {message} Normal activities may resume, but continue to exercise caution.',
      smsTemplate: 'ALL CLEAR: {message} Situation resolved. Resume normal activities with caution.',
      pushTitle: 'All Clear',
      pushBody: '{message} Emergency situation resolved.',
      tone: 'calm' as NotificationTone
    });

    return templates;
  }

  /**
   * Get emergency contact information
   */
  private getEmergencyContacts(): EmergencyContacts {
    return {
      police: '119',
      fire: '110',
      emergency: '911',
      odpem: '116',
      formatted: 'Emergency Contacts: Police 119 | Fire 110 | Emergency 911 | ODPEM 116'
    };
  }

  /**
   * Get appropriate message template based on alert type, severity, and tone
   */
  private getMessageTemplate(
    alertType: AlertType, 
    severity: Severity, 
    tone: NotificationTone = 'calm'
  ): MessageTemplate {
    const templateKey = `${alertType}_${severity}_${tone}`.toUpperCase();
    
    // Try exact match first
    let template = this.messageTemplates.get(templateKey);
    
    // Fallback to calm tone if urgent not found
    if (!template && tone === 'urgent') {
      const calmKey = `${alertType}_${severity}_CALM`;
      template = this.messageTemplates.get(calmKey);
    }
    
    // Fallback to medium severity if high not found
    if (!template && severity === 'HIGH') {
      const mediumKey = `${alertType}_MEDIUM_${tone}`.toUpperCase();
      template = this.messageTemplates.get(mediumKey);
    }
    
    // Default template if nothing found
    if (!template) {
      template = {
        title: `${alertType} Alert`,
        emailSubject: `${severity} ${alertType} Alert - {parishes}`,
        emailTemplate: '{message}',
        smsTemplate: `${alertType}: {message}`,
        pushTitle: `${alertType} Alert`,
        pushBody: '{message}',
        tone: tone
      };
    }
    
    return template;
  }

  /**
   * Determine notification tone based on alert characteristics
   */
  private determineNotificationTone(alert: Alert): NotificationTone {
    // Use urgent tone for high severity alerts or specific alert types
    if (alert.severity === 'HIGH' || 
        alert.title.toLowerCase().includes('urgent') ||
        alert.title.toLowerCase().includes('immediate')) {
      return 'urgent';
    }
    
    return 'calm';
  }

  /**
   * Send notifications to multiple users with batch processing
   */
  async sendBatchNotifications(
    users: any[],
    alert: Alert,
    batchSize: number = 100,
    rateLimitDelay: number = 1000
  ): Promise<BatchNotificationResult> {
    const totalRecipients = users.length;
    const results: NotificationResult[] = [];
    const deliveryStats = {
      email: { sent: 0, failed: 0 },
      sms: { sent: 0, failed: 0 },
      push: { sent: 0, failed: 0 }
    };

    // Process users in batches to avoid overwhelming services
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(user => 
        this.sendUserNotifications(user, alert)
      );

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        // Process batch results
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(...result.value);
            // Update delivery stats
            result.value.forEach(r => {
              if (r.success) {
                if (deliveryStats[r.deliveryMethod]) {
                  deliveryStats[r.deliveryMethod].sent++;
                }
              } else {
                if (deliveryStats[r.deliveryMethod]) {
                  deliveryStats[r.deliveryMethod].failed++;
                }
              }
            });
          } else {
            // Handle batch failure
            const user = batch[index];
            const failureResult: NotificationResult = {
              success: false,
              deliveryMethod: DeliveryMethod.EMAIL,
              userId: user.id,
              error: result.reason?.message || 'Batch processing failed'
            };
            results.push(failureResult);
            deliveryStats.email.failed++;
          }
        });

        // Rate limiting between batches
        if (i + batchSize < users.length) {
          await this.delay(rateLimitDelay);
        }

      } catch (error) {
        console.error(`Batch processing failed for batch starting at index ${i}:`, error);
        
        // Mark entire batch as failed
        batch.forEach(user => {
          const failureResult: NotificationResult = {
            success: false,
            deliveryMethod: DeliveryMethod.EMAIL,
            userId: user.id,
            error: error.message || 'Batch processing error'
          };
          results.push(failureResult);
          deliveryStats.email.failed++;
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return {
      totalRecipients,
      successCount,
      failureCount,
      results,
      deliveryStats
    };
  }

  /**
   * Send notifications to a single user with intelligent fallback logic
   */
  async sendUserNotifications(user: any, alert: Alert): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    const payload = this.createNotificationPayload(alert);

    // Define fallback chain: Email → Push → SMS
    const fallbackChain = this.buildFallbackChain(user, alert);
    
    let deliverySuccessful = false;
    let attemptedMethods: DeliveryMethod[] = [];

    for (const method of fallbackChain) {
      attemptedMethods.push(method);
      
      try {
        const result = await this.sendSingleNotification(user, alert, method, payload);
        results.push(result);

        // Log delivery attempt
        await this.logDeliveryAttempt(alert.id, user.id, method, result);

        if (result.success) {
          deliverySuccessful = true;
          
          // For high severity alerts, continue with all methods
          // For lower severity, stop after first successful delivery
          if (alert.severity !== 'HIGH' && payload.tone !== 'urgent') {
            break;
          }
        }
      } catch (error) {
        console.error(`Failed to send ${method} notification to user ${user.id}:`, error);
        
        const failureResult: NotificationResult = {
          success: false,
          deliveryMethod: method,
          userId: user.id,
          error: error.message
        };
        results.push(failureResult);

        // Log failed delivery attempt
        await this.logDeliveryAttempt(alert.id, user.id, method, failureResult);
      }
    }

    // If no delivery was successful and we haven't tried all methods, try remaining fallbacks
    if (!deliverySuccessful) {
      const remainingMethods = [DeliveryMethod.EMAIL, DeliveryMethod.PUSH, DeliveryMethod.SMS]
        .filter(method => !attemptedMethods.includes(method));
      
      for (const method of remainingMethods) {
        try {
          const result = await this.sendSingleNotification(user, alert, method, payload);
          results.push(result);
          await this.logDeliveryAttempt(alert.id, user.id, method, result);
          
          if (result.success) {
            deliverySuccessful = true;
            break;
          }
        } catch (error) {
          const failureResult: NotificationResult = {
            success: false,
            deliveryMethod: method,
            userId: user.id,
            error: error.message
          };
          results.push(failureResult);
          await this.logDeliveryAttempt(alert.id, user.id, method, failureResult);
        }
      }
    }

    return results;
  }

  /**
   * Build fallback chain based on user preferences and alert characteristics
   */
  private buildFallbackChain(user: User, alert: Alert): DeliveryMethod[] {
    const chain: DeliveryMethod[] = [];
    
    // For high severity or urgent alerts, prioritize fastest delivery
    if (alert.severity === 'HIGH') {
      // Push first for immediate delivery
      chain.push(DeliveryMethod.PUSH);
      
      // Then SMS if user has phone and SMS enabled
      if (user.smsAlerts && user.phone) {
        chain.push(DeliveryMethod.SMS);
      }
      
      // Email last for detailed information
      if (user.emailAlerts) {
        chain.push(DeliveryMethod.EMAIL);
      }
    } else {
      // For normal alerts, follow user preferences
      if (user.emailAlerts) {
        chain.push(DeliveryMethod.EMAIL);
      }
      
      if (user.smsAlerts && user.phone) {
        chain.push(DeliveryMethod.SMS);
      }
      
      // Push as fallback
      chain.push(DeliveryMethod.PUSH);
    }
    
    // Remove duplicates while preserving order
    return [...new Set(chain)];
  }

  /**
   * Send a single notification via specified method
   */
  private async sendSingleNotification(
    user: User,
    alert: Alert,
    method: DeliveryMethod,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    switch (method) {
      case DeliveryMethod.EMAIL:
        return await this.sendEmailNotification(user, alert, payload);
      
      case DeliveryMethod.SMS:
        return await this.sendSMSNotification(user, alert, payload);
      
      case DeliveryMethod.PUSH:
        return await this.sendPushNotification(user, alert, payload);
      
      default:
        throw new Error(`Unsupported delivery method: ${method}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    user: User,
    alert: Alert,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    try {
      const emailNotification: EmailNotification = {
        ...payload,
        to: user.email,
        subject: payload.emailSubject || payload.title,
        from: {
          name: 'JamAlert Emergency System',
          email: process.env.SMTP_FROM_EMAIL || 'alerts@jamalert.com'
        }
      };

      await this.emailService.sendAlertNotification(emailNotification);

      return {
        success: true,
        deliveryMethod: DeliveryMethod.EMAIL,
        userId: user.id,
        messageId: `email-${alert.id}-${user.id}-${Date.now()}`
      };
    } catch (error) {
      return {
        success: false,
        deliveryMethod: DeliveryMethod.EMAIL,
        userId: user.id,
        error: error.message
      };
    }
  }

  /**
   * Send SMS notification using SMS service
   */
  private async sendSMSNotification(
    user: User,
    alert: Alert,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    if (!user.phone) {
      return {
        success: false,
        deliveryMethod: DeliveryMethod.SMS,
        userId: user.id,
        error: 'No phone number provided'
      };
    }

    try {
      const smsNotification: SMSNotification = {
        ...payload,
        to: user.phone,
        message: payload.smsMessage || payload.message
      };

      const result = await this.smsService.sendSMS(smsNotification);
      
      return {
        success: result.success,
        deliveryMethod: DeliveryMethod.SMS,
        userId: user.id,
        messageId: result.messageId,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        deliveryMethod: DeliveryMethod.SMS,
        userId: user.id,
        error: error.message
      };
    }
  }

  /**
   * Send push notification (placeholder for Azure Notification Hubs)
   */
  private async sendPushNotification(
    user: User,
    alert: Alert,
    payload: NotificationPayload
  ): Promise<NotificationResult> {
    // TODO: Implement Azure Notification Hubs integration
    // For now, return success as fallback
    
    try {
      const pushNotification: PushNotification = {
        ...payload,
        title: payload.pushTitle || payload.title,
        message: payload.pushMessage || payload.message,
        userId: user.id,
        badge: 1,
        sound: this.getPushNotificationSound(alert.severity, payload.tone),
        data: {
          alertId: alert.id,
          parishes: payload.parishes,
          timestamp: new Date().toISOString(),
          tone: payload.tone
        }
      };

      // Placeholder push notification logic
      console.log(`Push notification would be sent to user ${user.id}:`, pushNotification);
      
      return {
        success: true,
        deliveryMethod: DeliveryMethod.PUSH,
        userId: user.id,
        messageId: `push-${alert.id}-${user.id}-${Date.now()}`
      };
    } catch (error) {
      return {
        success: false,
        deliveryMethod: DeliveryMethod.PUSH,
        userId: user.id,
        error: error.message
      };
    }
  }

  /**
   * Get appropriate push notification sound based on severity and tone
   */
  private getPushNotificationSound(severity: Severity, tone: NotificationTone): string {
    if (tone === 'urgent' || severity === 'HIGH') {
      return 'emergency.wav';
    } else if (severity === 'MEDIUM') {
      return 'alert.wav';
    } else {
      return 'default';
    }
  }

  /**
   * Create notification payload from alert using templates
   */
  private createNotificationPayload(alert: Alert, tone?: NotificationTone): NotificationPayload {
    const notificationTone = tone || this.determineNotificationTone(alert);
    const template = this.getMessageTemplate(alert.type, alert.severity, notificationTone);
    const parishes = alert.parishes as any[];
    const parishNames = parishes.map(p => this.formatParishName(p)).join(', ');
    
    // Replace template variables
    const processedMessage = this.processTemplate(alert.message, {
      parishes: parishNames,
      emergencyContacts: this.emergencyContacts.formatted
    });
    
    const processedEmailTemplate = this.processTemplate(template.emailTemplate, {
      message: processedMessage,
      parishes: parishNames,
      emergencyContacts: this.emergencyContacts.formatted
    });
    
    const processedSmsTemplate = this.processTemplate(template.smsTemplate, {
      message: processedMessage,
      parishes: parishNames,
      emergencyContacts: this.emergencyContacts.formatted
    });
    
    const processedPushBody = this.processTemplate(template.pushBody, {
      message: processedMessage,
      parishes: parishNames
    });

    return {
      title: template.title,
      message: processedEmailTemplate,
      smsMessage: processedSmsTemplate,
      pushTitle: template.pushTitle,
      pushMessage: processedPushBody,
      emailSubject: this.processTemplate(template.emailSubject, { parishes: parishNames }),
      type: alert.type,
      severity: alert.severity,
      alertId: alert.id,
      parishes: parishes,
      tone: notificationTone,
      emergencyContacts: this.emergencyContacts
    };
  }

  /**
   * Process template variables
   */
  private processTemplate(template: string, variables: Record<string, string>): string {
    let processed = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{${key}}`, 'g');
      processed = processed.replace(regex, value);
    });
    
    return processed;
  }

  /**
   * Format parish name for display
   */
  private formatParishName(parish: string): string {
    return parish
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Log delivery attempt to database
   */
  private async logDeliveryAttempt(
    alertId: string,
    userId: string,
    method: DeliveryMethod,
    result: NotificationResult
  ): Promise<void> {
    try {
      await withRetry(async () => {
        await this.prisma.alertDeliveryLog.create({
          data: {
            alertId,
            userId,
            deliveryMethod: method,
            status: result.success ? DeliveryLogStatus.SENT : DeliveryLogStatus.FAILED,
            errorMessage: result.error,
            sentAt: result.success ? new Date() : null,
            deliveredAt: result.success ? new Date() : null // Assume immediate delivery for now
          }
        });
      }, `Log delivery attempt for alert ${alertId}`);
    } catch (error) {
      console.error('Failed to log delivery attempt:', error);
      // Don't throw - logging failure shouldn't stop notification process
    }
  }

  /**
   * Retry failed notifications
   */
  async retryFailedNotifications(
    alertId: string,
    maxRetries: number = 3
  ): Promise<BatchNotificationResult> {
    // Get failed delivery logs
    const failedLogs = await this.prisma.alertDeliveryLog.findMany({
      where: {
        alertId,
        status: DeliveryLogStatus.FAILED
      },
      include: {
        user: true,
        alert: true
      }
    });

    if (failedLogs.length === 0) {
      return {
        totalRecipients: 0,
        successCount: 0,
        failureCount: 0,
        results: [],
        deliveryStats: {
          email: { sent: 0, failed: 0 },
          sms: { sent: 0, failed: 0 },
          push: { sent: 0, failed: 0 }
        }
      };
    }

    const users = failedLogs.map(log => log.user);
    const alert = failedLogs[0].alert;

    // Retry with smaller batch size and longer delays
    return await this.sendBatchNotifications(users, alert, 50, 2000);
  }

  /**
   * Get delivery statistics for an alert
   */
  async getDeliveryStats(alertId: string): Promise<{
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    byMethod: Record<DeliveryMethod, { sent: number; failed: number; pending: number }>;
  }> {
    const logs = await this.prisma.alertDeliveryLog.findMany({
      where: { alertId }
    });

    const stats = {
      total: logs.length,
      delivered: 0,
      failed: 0,
      pending: 0,
      byMethod: {
        [DeliveryMethod.EMAIL]: { sent: 0, failed: 0, pending: 0 },
        [DeliveryMethod.SMS]: { sent: 0, failed: 0, pending: 0 },
        [DeliveryMethod.PUSH]: { sent: 0, failed: 0, pending: 0 }
      }
    };

    logs.forEach(log => {
      switch (log.status) {
        case DeliveryLogStatus.DELIVERED:
        case DeliveryLogStatus.SENT:
          stats.delivered++;
          stats.byMethod[log.deliveryMethod].sent++;
          break;
        case DeliveryLogStatus.FAILED:
        case DeliveryLogStatus.BOUNCED:
          stats.failed++;
          stats.byMethod[log.deliveryMethod].failed++;
          break;
        case DeliveryLogStatus.PENDING:
          stats.pending++;
          stats.byMethod[log.deliveryMethod].pending++;
          break;
      }
    });

    return stats;
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Send "all clear" notification for resolved incidents
   */
  async sendAllClearNotification(
    users: User[],
    originalAlert: Alert,
    clearanceMessage: string
  ): Promise<BatchNotificationResult> {
    // Create all clear alert
    const allClearAlert: Alert = {
      ...originalAlert,
      id: `clear-${originalAlert.id}`,
      type: 'ALL_CLEAR' as AlertType,
      severity: 'LOW' as Severity,
      title: 'All Clear',
      message: clearanceMessage,
      createdAt: new Date(),
      expiresAt: null
    };

    // Send notifications using calm tone
    const payload = this.createNotificationPayload(allClearAlert, 'calm');
    
    return await this.sendBatchNotifications(users, allClearAlert, 100, 500);
  }

  /**
   * Send custom notification with specific tone and template
   */
  async sendCustomNotification(
    users: User[],
    alertData: {
      type: AlertType;
      severity: Severity;
      title: string;
      message: string;
      parishes: any[];
    },
    tone: NotificationTone = 'calm'
  ): Promise<BatchNotificationResult> {
    const customAlert: Alert = {
      id: `custom-${Date.now()}`,
      ...alertData,
      createdBy: null,
      createdAt: new Date(),
      expiresAt: null,
      deliveryStatus: 'PENDING' as any,
      recipientCount: users.length,
      deliveredCount: 0,
      failedCount: 0
    };

    return await this.sendBatchNotifications(users, customAlert, 100, 1000);
  }

  /**
   * Test notification service health
   */
  async testHealth(): Promise<{
    email: boolean;
    sms: boolean;
    push: boolean;
  }> {
    return {
      email: await this.emailService.testConnection(),
      sms: await this.smsService.testConnection(),
      push: true // Placeholder - always healthy for now
    };
  }

  /**
   * Close notification service
   */
  async close(): Promise<void> {
    await Promise.all([
      this.emailService.close(),
      this.smsService.close()
    ]);
  }
}