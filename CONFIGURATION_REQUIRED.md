# 🔧 Configuration Required

**Status**: Environment variables have been set with placeholder values.  
**Action Required**: Replace placeholders with actual credentials.

## ⚠️ Placeholder Values to Replace

The following environment variables are currently set to placeholder values and **must be updated** with real credentials:

### 1. SMTP Email Configuration

Currently set to placeholders. Choose one of these options:

#### Option A: Gmail with App Password (Recommended for Testing)

1. Enable 2FA on your Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Update settings:

```bash
az functionapp config appsettings set \
  --name jamalert-hackathon \
  --resource-group JamAlert \
  --settings \
    SMTP_USER="your-actual-email@gmail.com" \
    SMTP_PASS="your-generated-app-password"
```

#### Option B: SendGrid (Recommended for Production)

1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Create API key from Settings > API Keys
3. Update settings:

```bash
az functionapp config appsettings set \
  --name jamalert-hackathon \
  --resource-group JamAlert \
  --settings \
    SMTP_USER="apikey" \
    SMTP_PASS="your-sendgrid-api-key"
```

### 2. Weather API Configuration

Currently set to placeholder. To enable weather monitoring:

1. Sign up at https://openweathermap.org/api
2. Get API key (free tier: 1,000 calls/day)
3. Update setting:

```bash
az functionapp config appsettings set \
  --name jamalert-hackathon \
  --resource-group JamAlert \
  --settings \
    WEATHER_API_KEY="your-actual-openweather-api-key"
```

### 3. SMS Notifications (Optional - Twilio)

Not currently configured. To enable SMS alerts:

1. Sign up at https://www.twilio.com/try-twilio (free trial: $15 credit)
2. Get credentials from console
3. Add settings:

```bash
az functionapp config appsettings set \
  --name jamalert-hackathon \
  --resource-group JamAlert \
  --settings \
    TWILIO_ACCOUNT_SID="your-twilio-account-sid" \
    TWILIO_AUTH_TOKEN="your-twilio-auth-token" \
    TWILIO_PHONE_NUMBER="your-twilio-phone-number"
```

## ✅ Already Configured

The following are already properly configured:

- ✅ `DATABASE_URL` - Connected to Azure MySQL
- ✅ `JWT_SECRET` - Secure random secret generated
- ✅ `NODE_ENV` - Set to production
- ✅ `SMTP_HOST` - smtp.gmail.com
- ✅ `SMTP_PORT` - 587
- ✅ `SMTP_FROM` - JamAlert System <noreply@jamalert.com>

## 🔍 Verify Configuration

After updating the credentials, verify they work:

```bash
# Test email notification
curl -X POST https://jamalert-hackathon.azurewebsites.net/api/alerts/send \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "TEST",
    "title": "Configuration Test",
    "message": "Testing email notifications"
  }'

# Check Application Insights for errors
az monitor app-insights query \
  --app <APP_INSIGHTS_ID> \
  --analytics-query "traces | where message contains 'error' or message contains 'SMTP' | take 20"
```

## 📋 Current Status

| Variable | Status | Action Required |
|----------|--------|-----------------|
| DATABASE_URL | ✅ Configured | None |
| JWT_SECRET | ✅ Configured | None |
| SMTP_HOST | ✅ Configured | None |
| SMTP_PORT | ✅ Configured | None |
| SMTP_FROM | ✅ Configured | None |
| SMTP_USER | ⚠️ Placeholder | **Update with real email** |
| SMTP_PASS | ⚠️ Placeholder | **Update with real password** |
| WEATHER_API_KEY | ⚠️ Placeholder | **Update with real API key** |
| TWILIO_* | ❌ Not Set | Optional: Add if SMS needed |

## 🚨 Important Notes

1. **Function App Restart**: The Function App restarted automatically when environment variables were added
2. **Test Before Production**: Test email/SMS functionality before relying on it for real alerts
3. **Free Tier Limits**: 
   - Gmail: ~500 emails/day with App Password
   - SendGrid: 100 emails/day (free tier)
   - OpenWeather: 1,000 API calls/day (free tier)
   - Twilio: $15 credit for trial

## 📖 Next Steps

After updating credentials:

1. ✅ Test database connectivity (see DEPLOYMENT_NEXT_STEPS.md)
2. ✅ Create initial admin user
3. ✅ Test function endpoints
4. ✅ Verify email notifications work
5. ✅ Test weather monitoring
6. ✅ Update Vercel frontend with backend URL

---

**Last Updated**: October 26, 2025  
**Function App**: jamalert-hackathon.azurewebsites.net
