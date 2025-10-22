# Vercel Environment Variables Setup

This document provides instructions for configuring environment variables in Vercel for the JAMALERT production deployment.

## Required Environment Variables

### Already Configured (in vercel.json)
These are already set in `vercel.json` and will be automatically applied:

```
NEXT_PUBLIC_API_BASE_URL=https://jamalert-hackathon.azurewebsites.net/api
NEXT_PUBLIC_FALLBACK_API_URL=https://jamalert-express-api.azurewebsites.net/api
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_ENVIRONMENT=production
NEXT_PUBLIC_BACKEND_TYPE=azure-functions
```

### Additional Variables to Add via Vercel Dashboard

Navigate to: https://vercel.com/your-project/settings/environment-variables

Add the following variables:

#### OpenWeather API (CONFIGURED ✅)
```
NEXT_PUBLIC_WEATHER_API_KEY=cda9eb2ef470b557b4fdb77332f5e9e7
```

#### SMTP Configuration (Email Notifications)
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM_NAME=JamAlert System
SMTP_FROM_EMAIL=noreply@jamalert.jm
```

**Note:** For Gmail, you need to:
1. Enable 2-factor authentication
2. Generate an "App Password" at https://myaccount.google.com/apppasswords
3. Use the app password as `SMTP_PASS`

#### Twilio Configuration (SMS Notifications)
```
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+1234567890
SMS_ENABLED=true
```

**Note:** Sign up for Twilio at https://www.twilio.com/try-twilio

#### Database Configuration (for Azure MySQL)
```
DATABASE_URL=mysql://username:password@jamalert-prod-mysql.mysql.database.azure.com:3306/jamalert?ssl=true
```

#### JWT Secret (for authentication)
```
JWT_SECRET=your-secure-jwt-secret-key-at-least-32-characters-long
```

**Note:** Generate a secure random string:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Azure Services (Optional)
```
AZURE_NOTIFICATION_HUB_CONNECTION=your-connection-string
AZURE_STORAGE_CONNECTION=your-connection-string
APPLICATIONINSIGHTS_CONNECTION_STRING=your-connection-string
```

## How to Add Environment Variables in Vercel

### Method 1: Via Vercel Dashboard (Recommended)
1. Go to https://vercel.com/
2. Select your project (jamalert)
3. Click "Settings" tab
4. Click "Environment Variables" in the left sidebar
5. Add each variable:
   - Enter the variable name (e.g., `NEXT_PUBLIC_WEATHER_API_KEY`)
   - Enter the value
   - Select environments: Production, Preview, Development (or as needed)
   - Click "Save"
6. Redeploy your application for changes to take effect

### Method 2: Via Vercel CLI
```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Login to Vercel
vercel login

# Add environment variable
vercel env add NEXT_PUBLIC_WEATHER_API_KEY production
# Then paste the value when prompted

# Pull environment variables to local
vercel env pull
```

### Method 3: Via .env.production.local (Local Development Only)
Create a file `.env.production.local` in the project root:
```env
NEXT_PUBLIC_WEATHER_API_KEY=cda9eb2ef470b557b4fdb77332f5e9e7
# Add other variables...
```

**Note:** This file should be added to `.gitignore` and is only for local testing.

## Verification

After adding environment variables:

1. **Trigger a new deployment:**
   ```bash
   git commit --allow-empty -m "Trigger deployment for env vars"
   git push origin master
   ```

2. **Check deployment logs:**
   - Go to Vercel dashboard
   - Click on the latest deployment
   - Check "Build Logs" for any errors

3. **Test the application:**
   - Visit https://jamalert.vercel.app/
   - Check browser console for errors
   - Test weather widget functionality
   - Test email/SMS notifications (if configured)

## Security Best Practices

1. **Never commit sensitive values to Git:**
   - API keys
   - Passwords
   - Connection strings
   - JWT secrets

2. **Use different values for different environments:**
   - Development: Use test/demo keys
   - Production: Use real API keys with appropriate limits

3. **Rotate secrets regularly:**
   - Change JWT secrets periodically
   - Rotate API keys every 90 days
   - Update passwords quarterly

4. **Use environment-specific prefixes:**
   - `NEXT_PUBLIC_*` - Exposed to browser (use for non-sensitive data only)
   - No prefix - Server-side only (use for sensitive data)

## Current Status

### ✅ Configured
- [x] OpenWeather API key (local backend)
- [x] Basic Vercel deployment settings

### ⚠️ Pending Configuration
- [ ] OpenWeather API key (Vercel environment)
- [ ] SMTP service for email notifications
- [ ] Twilio service for SMS notifications
- [ ] Azure MySQL database connection
- [ ] JWT secret for production
- [ ] Azure services (optional)

## Next Steps

1. **Add OpenWeather API key to Vercel** (highest priority)
2. **Configure SMTP service** for email notifications
3. **Configure Twilio service** for SMS notifications
4. **Set up Azure MySQL database** and add connection string
5. **Generate and add JWT secret** for production
6. **Test all services** after configuration

## Support

For issues with:
- **Vercel:** https://vercel.com/support
- **OpenWeather API:** https://openweathermap.org/appid
- **Gmail SMTP:** https://support.google.com/mail/answer/7126229
- **Twilio:** https://www.twilio.com/docs

## References

- [Vercel Environment Variables Documentation](https://vercel.com/docs/concepts/projects/environment-variables)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [OpenWeather API Documentation](https://openweathermap.org/api)
- [Twilio SMS Documentation](https://www.twilio.com/docs/sms)
- [Nodemailer SMTP Documentation](https://nodemailer.com/smtp/)

