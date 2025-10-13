// @ts-nocheck
import { Twilio } from 'twilio';
import { getSMSConfig, isProduction } from '../lib/config';
import { SMSNotification } from '../types';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
  cost?: number;
}

export class SMSService {
  private client: Twilio | null = null;
  private config = getSMSConfig();
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = this.config.enabled && !!this.config.accountSid && !!this.config.authToken;
    
    if (this.isEnabled) {
      this.client = new Twilio(this.config.accountSid, this.config.authToken);
    } else {
      console.warn('SMS service is disabled or not configured properly');
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(notification: SMSNotification): Promise<SMSResult> {
    if (!this.isEnabled || !this.client) {
      console.log(`SMS would be sent to ${notification.to}: ${notification.message}`);
      return {
        success: true,
        messageId: `mock-sms-${Date.now()}`,
        cost: 0
      };
    }

    try {
      // Format phone number for international delivery
      const formattedPhone = this.formatPhoneNumber(notification.to);
      
      // Truncate message if too long (SMS limit is 160 characters)
      const message = this.truncateMessage(notification.message || notification.smsMessage);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.config.fromNumber,
        to: formattedPhone,
        // Add status callback for delivery tracking
        statusCallback: this.config.statusCallback,
        // Set validity period (how long to attempt delivery)
        validityPeriod: 14400, // 4 hours
      });

      return {
        success: true,
        messageId: result.sid,
        cost: parseFloat(result.price || '0')
      };
    } catch (error) {
      console.error('SMS sending failed:', error);
      
      return {
        success: false,
        error: error.message || 'SMS delivery failed'
      };
    }
  }

  /**
   * Send bulk SMS notifications with rate limiting
   */
  async sendBulkSMS(
    notifications: SMSNotification[],
    batchSize: number = 10,
    delayMs: number = 1000
  ): Promise<SMSResult[]> {
    const results: SMSResult[] = [];
    
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(notification => this.sendSMS(notification));
      const batchResults = await Promise.allSettled(batchPromises);
      
      // Process results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            error: result.reason?.message || 'Batch processing failed'
          });
        }
      });
      
      // Rate limiting delay between batches
      if (i + batchSize < notifications.length) {
        await this.delay(delayMs);
      }
    }
    
    return results;
  }

  /**
   * Format phone number for international delivery
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // If it starts with 1876 (Jamaica country code), use as is
    if (cleaned.startsWith('1876')) {
      return `+${cleaned}`;
    }
    
    // If it starts with 876, add country code
    if (cleaned.startsWith('876')) {
      return `+1${cleaned}`;
    }
    
    // If it's 7 digits, assume it's a local Jamaica number
    if (cleaned.length === 7) {
      return `+1876${cleaned}`;
    }
    
    // If it's 10 digits and starts with 876, add country code
    if (cleaned.length === 10 && cleaned.startsWith('876')) {
      return `+1${cleaned}`;
    }
    
    // If it's 11 digits and starts with 1876, use as is
    if (cleaned.length === 11 && cleaned.startsWith('1876')) {
      return `+${cleaned}`;
    }
    
    // Default: assume it needs Jamaica country code
    return `+1876${cleaned}`;
  }

  /**
   * Truncate message to fit SMS limits while preserving important information
   */
  private truncateMessage(message: string, maxLength: number = 160): string {
    if (message.length <= maxLength) {
      return message;
    }
    
    // Try to truncate at word boundary
    const truncated = message.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Get SMS delivery status
   */
  async getMessageStatus(messageId: string): Promise<{
    status: string;
    errorCode?: string;
    errorMessage?: string;
  } | null> {
    if (!this.isEnabled || !this.client) {
      return null;
    }

    try {
      const message = await this.client.messages(messageId).fetch();
      
      return {
        status: message.status,
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage
      };
    } catch (error) {
      console.error('Failed to get SMS status:', error);
      return null;
    }
  }

  /**
   * Get account balance and usage statistics
   */
  async getAccountInfo(): Promise<{
    balance?: string;
    currency?: string;
    messagesThisMonth?: number;
  } | null> {
    if (!this.isEnabled || !this.client) {
      return null;
    }

    try {
      const account = await this.client.api.accounts(this.config.accountSid).fetch();
      
      // Get usage for current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const usage = await this.client.usage.records.list({
        category: 'sms',
        startDate: startOfMonth,
        endDate: now
      });

      const smsUsage = usage.find(record => record.category === 'sms');
      
      return {
        balance: typeof account.balance === 'function' ? '0.00' : account.balance,
        currency: 'USD', // Default currency
        messagesThisMonth: smsUsage ? parseInt(smsUsage.count) : 0
      };
    } catch (error) {
      console.error('Failed to get account info:', error);
      return null;
    }
  }

  /**
   * Test SMS service connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.isEnabled || !this.client) {
      return false;
    }

    try {
      // Try to fetch account info as a connection test
      await this.client.api.accounts(this.config.accountSid).fetch();
      return true;
    } catch (error) {
      console.error('SMS service connection test failed:', error);
      return false;
    }
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phone: string): {
    isValid: boolean;
    formatted?: string;
    error?: string;
  } {
    try {
      const formatted = this.formatPhoneNumber(phone);
      
      // Basic validation for Jamaica numbers
      if (formatted.match(/^\+1876\d{7}$/)) {
        return {
          isValid: true,
          formatted: formatted
        };
      }
      
      return {
        isValid: false,
        error: 'Invalid Jamaica phone number format'
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close SMS service
   */
  async close(): Promise<void> {
    // Twilio client doesn't need explicit closing
    this.client = null;
  }
}