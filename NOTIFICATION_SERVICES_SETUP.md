# Notification Services Setup Guide

This document provides step-by-step instructions for configuring email (SMTP) and SMS (Twilio) notification services for JAMALERT.

---

## 📧 Email Notifications (SMTP)

### Option 1: Gmail SMTP (Recommended for Testing)

#### Prerequisites
- Gmail account
- 2-Factor Authentication enabled

#### Setup Steps

1. **Enable 2-Factor Authentication:**
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"

2. **Generate App Password:**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "JamAlert" as the name
   - Click "Generate"
   - Copy the 16-character password

3. **Configure Environment Variables:**

   **Local Backend (.env):**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   SMTP_FROM_NAME=JamAlert System
   SMTP_FROM_EMAIL=your-email@gmail.com
   ```

   **Vercel (Production):**
   Add these via Vercel Dashboard → Settings → Environment Variables

4. **Test Email Sending:**
   ```bash
   # From backend directory
   node -e "
   const nodemailer = require('nodemailer');
   const transporter = nodemailer.createTransporter({
     host: 'smtp.gmail.com',
     port: 587,
     secure: false,
     auth: {
       user: 'your-email@gmail.com',
       pass: 'your-app-password'
     }
   });
   transporter.sendMail({
     from: 'JamAlert <your-email@gmail.com>',
     to: 'test@example.com',
     subject: 'Test Email',
     text: 'This is a test email from JamAlert'
   }).then(() => console.log('✅ Email sent!')).catch(console.error);
   "
   ```

#### Gmail Limitations
- **Daily limit:** 500 emails per day
- **Rate limit:** 100 emails per hour
- **Not recommended for production** with high volume

---

### Option 2: SendGrid (Recommended for Production)

#### Prerequisites
- SendGrid account (free tier: 100 emails/day)

#### Setup Steps

1. **Create SendGrid Account:**
   - Go to https://signup.sendgrid.com/
   - Sign up for free account
   - Verify your email address

2. **Create API Key:**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name: "JamAlert Production"
   - Permissions: "Full Access" or "Mail Send"
   - Copy the API key (you won't see it again!)

3. **Verify Sender Identity:**
   - Go to Settings → Sender Authentication
   - Click "Verify a Single Sender"
   - Fill in your details
   - Verify the email sent to you

4. **Configure Environment Variables:**

   **Local Backend (.env):**
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASS=your-sendgrid-api-key
   SMTP_FROM_NAME=JamAlert System
   SMTP_FROM_EMAIL=verified-sender@yourdomain.com
   ```

5. **Test with SendGrid:**
   ```bash
   curl -X POST https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "personalizations": [{"to": [{"email": "test@example.com"}]}],
       "from": {"email": "verified-sender@yourdomain.com"},
       "subject": "Test Email",
       "content": [{"type": "text/plain", "value": "Test from JamAlert"}]
     }'
   ```

#### SendGrid Pricing
- **Free:** 100 emails/day forever
- **Essentials:** $19.95/month - 50,000 emails/month
- **Pro:** $89.95/month - 100,000 emails/month

---

### Option 3: Mailgun (Alternative)

#### Setup Steps

1. **Create Mailgun Account:**
   - Go to https://signup.mailgun.com/
   - Sign up for free account (5,000 emails/month for 3 months)

2. **Get SMTP Credentials:**
   - Go to Sending → Domain Settings → SMTP Credentials
   - Copy the credentials

3. **Configure Environment Variables:**
   ```env
   SMTP_HOST=smtp.mailgun.org
   SMTP_PORT=587
   SMTP_USER=postmaster@your-domain.mailgun.org
   SMTP_PASS=your-mailgun-password
   SMTP_FROM_NAME=JamAlert System
   SMTP_FROM_EMAIL=noreply@your-domain.mailgun.org
   ```

---

## 📱 SMS Notifications (Twilio)

### Prerequisites
- Twilio account
- Credit card (for verification, free trial available)

### Setup Steps

1. **Create Twilio Account:**
   - Go to https://www.twilio.com/try-twilio
   - Sign up for free trial
   - Verify your email and phone number
   - Get $15.50 free credit

2. **Get Account Credentials:**
   - Go to Console Dashboard
   - Copy your "Account SID"
   - Copy your "Auth Token" (click to reveal)

3. **Get a Phone Number:**
   - Go to Phone Numbers → Manage → Buy a number
   - Search for numbers in your country
   - For Jamaica: Search for "+1876" numbers
   - Purchase a number (uses trial credit)

4. **Configure Environment Variables:**

   **Local Backend (.env):**
   ```env
   TWILIO_ACCOUNT_SID=your-account-sid
   TWILIO_AUTH_TOKEN=your-auth-token
   TWILIO_FROM_NUMBER=+1876XXXXXXX
   SMS_ENABLED=true
   ```

   **Vercel (Production):**
   Add these via Vercel Dashboard → Settings → Environment Variables

5. **Test SMS Sending:**
   ```bash
   # From backend directory
   node -e "
   const twilio = require('twilio');
   const client = twilio('YOUR_ACCOUNT_SID', 'YOUR_AUTH_TOKEN');
   client.messages.create({
     body: 'Test SMS from JamAlert',
     from: '+1876XXXXXXX',
     to: '+1876YYYYYYY'
   }).then(message => console.log('✅ SMS sent:', message.sid)).catch(console.error);
   "
   ```

6. **Verify Phone Numbers (Trial Account):**
   - Trial accounts can only send to verified numbers
   - Go to Phone Numbers → Manage → Verified Caller IDs
   - Add and verify test phone numbers

7. **Upgrade for Production:**
   - Go to Billing → Upgrade
   - Add payment method
   - Remove trial restrictions
   - Enable sending to any number

### Twilio Pricing (Jamaica)
- **SMS to Jamaica:** ~$0.0075 per message
- **Phone number rental:** ~$1.00/month
- **Incoming SMS:** Free

### Twilio Features for JamAlert
- **Bulk SMS:** Send to multiple recipients
- **Delivery Status:** Track message delivery
- **Two-way SMS:** Receive replies
- **Short Codes:** For high-volume sending
- **WhatsApp:** Alternative to SMS

---

## 🔧 Backend Integration

### Email Service Implementation

The backend already has email service configured in:
- `backend/src/services/email.service.ts` (Azure Functions)
- `backend/express-app/services/email-service.js` (Express)

**Example Usage:**
```typescript
import { EmailService } from './services/email.service';

const emailService = new EmailService();
await emailService.sendAlertEmail({
  to: 'user@example.com',
  subject: 'Flash Flood Warning',
  alertType: 'flood',
  severity: 'high',
  location: 'Kingston',
  message: 'Heavy rainfall expected...'
});
```

### SMS Service Implementation

The backend already has SMS service configured in:
- `backend/src/services/sms.service.ts` (Azure Functions)
- `backend/express-app/services/sms-service.js` (Express)

**Example Usage:**
```typescript
import { SMSService } from './services/sms.service';

const smsService = new SMSService();
await smsService.sendAlertSMS({
  to: '+1876XXXXXXX',
  message: 'ALERT: Flash Flood Warning in Kingston. Seek higher ground immediately.'
});
```

---

## ✅ Configuration Checklist

### Email (SMTP)
- [ ] Choose SMTP provider (Gmail/SendGrid/Mailgun)
- [ ] Create account and verify email
- [ ] Generate API key or app password
- [ ] Add credentials to `.env` file
- [ ] Add credentials to Vercel environment variables
- [ ] Test email sending locally
- [ ] Test email sending in production
- [ ] Configure email templates
- [ ] Set up email rate limiting

### SMS (Twilio)
- [ ] Create Twilio account
- [ ] Verify phone number
- [ ] Get Account SID and Auth Token
- [ ] Purchase phone number
- [ ] Add credentials to `.env` file
- [ ] Add credentials to Vercel environment variables
- [ ] Verify test phone numbers (trial)
- [ ] Test SMS sending locally
- [ ] Test SMS sending in production
- [ ] Upgrade account for production (remove trial restrictions)
- [ ] Configure SMS rate limiting

---

## 🧪 Testing

### Test Email Locally
```bash
cd JamAlert_HackathonV2/backend/express-app
node -e "
const nodemailer = require('nodemailer');
require('dotenv').config();
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
transporter.sendMail({
  from: process.env.SMTP_FROM_EMAIL,
  to: 'your-test-email@example.com',
  subject: 'JamAlert Test Email',
  text: 'If you receive this, email is configured correctly!'
}).then(() => console.log('✅ Email sent!')).catch(console.error);
"
```

### Test SMS Locally
```bash
cd JamAlert_HackathonV2/backend/express-app
node -e "
const twilio = require('twilio');
require('dotenv').config();
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
client.messages.create({
  body: 'JamAlert test SMS. If you receive this, SMS is configured correctly!',
  from: process.env.TWILIO_FROM_NUMBER,
  to: '+1876XXXXXXX'
}).then(msg => console.log('✅ SMS sent:', msg.sid)).catch(console.error);
"
```

---

## 📊 Monitoring

### Email Delivery Monitoring
- **SendGrid:** Dashboard → Activity → Email Activity
- **Mailgun:** Logs → Email Logs
- **Gmail:** Sent folder

### SMS Delivery Monitoring
- **Twilio:** Console → Monitor → Logs → Messaging
- Track delivery status, errors, and costs

---

## 🚨 Troubleshooting

### Email Issues
- **"Authentication failed":** Check SMTP credentials
- **"Connection timeout":** Check SMTP host and port
- **"Sender not verified":** Verify sender email in provider dashboard
- **"Daily limit exceeded":** Upgrade plan or switch provider

### SMS Issues
- **"Authentication Error":** Check Account SID and Auth Token
- **"Invalid phone number":** Ensure E.164 format (+1876XXXXXXX)
- **"Unverified number" (trial):** Add number to verified caller IDs
- **"Insufficient funds":** Add credit to Twilio account

---

## 📝 Next Steps

1. **Choose and configure SMTP provider** (recommend SendGrid for production)
2. **Set up Twilio account** and purchase Jamaica phone number
3. **Add all credentials** to local `.env` and Vercel environment variables
4. **Test both services** locally and in production
5. **Monitor usage and costs** in provider dashboards
6. **Set up rate limiting** to prevent abuse
7. **Configure email templates** for different alert types
8. **Implement retry logic** for failed deliveries

---

## 📞 Support

- **SendGrid Support:** https://support.sendgrid.com/
- **Twilio Support:** https://support.twilio.com/
- **Gmail SMTP:** https://support.google.com/mail/answer/7126229
- **Mailgun Support:** https://help.mailgun.com/

