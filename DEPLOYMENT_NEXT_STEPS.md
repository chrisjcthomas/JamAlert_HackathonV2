# JamAlert Backend - Post-Deployment Next Steps

**Created**: October 26, 2025  
**Status**: Backend successfully deployed to Azure  
**Deployment URL**: https://jamalert-hackathon.azurewebsites.net

## 🎯 Overview

This document outlines the next steps required to complete the JamAlert backend deployment and make the system fully operational. The backend is now deployed with all 32 Azure Functions, but additional configuration and verification is needed.

---

## 📋 Next Steps Priority Matrix

### 🔴 **Priority 1: Critical (Must Do Immediately)**
These steps are required for the backend to function properly.

### 🟡 **Priority 2: Important (Do Soon)**
These steps improve reliability and user experience.

### 🟢 **Priority 3: Optional (Nice to Have)**
These steps enhance the system but aren't blocking.

---

## 🔴 Priority 1: Critical Steps

### 1. Verify Function Endpoints Respond ⏱️ 15 minutes

**Why**: Functions may need cold start time or have runtime errors  
**Status**: Not verified yet (getting 404/timeout on initial test)

**Tasks**:
- [ ] Wait 5-10 minutes for Azure Functions to fully initialize (cold start)
- [ ] Test each critical endpoint category:
  - [ ] Health check: `GET /api/admin/health`
  - [ ] Auth endpoint: `POST /api/auth/login` (should return 400 for empty body)
  - [ ] Alerts endpoint: `GET /api/alerts/history` (should return 401 without auth)
  - [ ] Incidents endpoint: `GET /api/incidents/list` (should return data or 401)

**Commands**:
```bash
# Test health endpoint
curl https://jamalert-hackathon.azurewebsites.net/api/admin/health

# Test auth endpoint (should return validation error)
curl -X POST https://jamalert-hackathon.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{}'

# List functions to verify all are deployed
az functionapp function list \
  --name jamalert-hackathon \
  --resource-group JamAlert \
  --query "[].name" \
  --output table
```

**Expected Results**:
- Health endpoint: 200 OK with system status JSON
- Auth endpoint: 400 Bad Request with validation errors
- Functions list: All 32 functions shown

**Troubleshooting**:
- If 404 errors persist after 10 minutes, check Azure Portal logs
- If 500 errors, check Application Insights for stack traces
- If timeout, verify Function App is running in Azure Portal

---

### 2. Configure Environment Variables ⏱️ 30 minutes

**Why**: Functions need API keys and connection strings to work  
**Status**: Database URL configured, other keys missing

**Current Configuration**:
- ✅ `DATABASE_URL` - Configured (Azure MySQL)
- ❌ `JWT_SECRET` - Not configured
- ❌ `SMTP_*` - Not configured (email notifications won't work)
- ❌ `WEATHER_API_KEY` - Not configured (weather alerts won't work)
- ❌ `TWILIO_*` - Not configured (SMS notifications won't work)

**Tasks**:

#### A. Generate JWT Secret
```bash
# Generate a secure 64-character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### B. Get OpenWeather API Key
1. Go to https://openweathermap.org/api
2. Sign up for free account
3. Get API key (One Call API 3.0)
4. Free tier includes: 1,000 calls/day

#### C. Configure Email (Choose one option)

**Option 1: Gmail with App Password (Easiest)**
1. Enable 2FA on Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use credentials:
   - `SMTP_HOST`: smtp.gmail.com
   - `SMTP_PORT`: 587
   - `SMTP_USER`: your-email@gmail.com
   - `SMTP_PASS`: generated-app-password

**Option 2: SendGrid (Professional)**
1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Create API key
3. Use credentials:
   - `SMTP_HOST`: smtp.sendgrid.net
   - `SMTP_PORT`: 587
   - `SMTP_USER`: apikey
   - `SMTP_PASS`: your-sendgrid-api-key

#### D. Configure SMS - Twilio (Optional but Recommended)
1. Sign up at https://www.twilio.com/try-twilio (free trial: $15 credit)
2. Get credentials from console:
   - `TWILIO_ACCOUNT_SID`: Your Account SID
   - `TWILIO_AUTH_TOKEN`: Your Auth Token
   - `TWILIO_PHONE_NUMBER`: Your Twilio phone number

#### E. Apply Configuration to Azure
```bash
# Set all environment variables at once
az functionapp config appsettings set \
  --name jamalert-hackathon \
  --resource-group JamAlert \
  --settings \
    JWT_SECRET="<YOUR_GENERATED_SECRET>" \
    SMTP_HOST="smtp.gmail.com" \
    SMTP_PORT="587" \
    SMTP_USER="<YOUR_EMAIL>@gmail.com" \
    SMTP_PASS="<YOUR_APP_PASSWORD>" \
    SMTP_FROM="JamAlert System <<YOUR_EMAIL>>" \
    WEATHER_API_KEY="<YOUR_API_KEY>" \
    TWILIO_ACCOUNT_SID="<YOUR_SID>" \
    TWILIO_AUTH_TOKEN="<YOUR_TOKEN>" \
    TWILIO_PHONE_NUMBER="<YOUR_PHONE>"

# Or set individually in Azure Portal:
# Function App > Settings > Environment variables
```

**Note**: After setting environment variables, the Function App will restart automatically.

---

### 3. Test Database Connectivity ⏱️ 20 minutes

**Why**: Verify functions can connect to and query the database  
**Status**: Schema deployed, connectivity not verified from functions

**Tasks**:
- [ ] Verify database schema exists
- [ ] Test database connection from functions
- [ ] Check for any connection errors in logs

**Commands**:
```bash
# Connect to Azure MySQL directly
mysql -h jamalerthackathon.mysql.database.azure.com \
  -u adminjamalert \
  -p \
  --ssl-mode=REQUIRED \
  jamalert

# Once connected, check tables exist:
SHOW TABLES;
DESCRIBE User;
DESCRIBE Alert;
SELECT COUNT(*) FROM User;

# Check Application Insights for database errors
az monitor app-insights query \
  --app jamalert-hackathon \
  --analytics-query "traces | where message contains 'database' or message contains 'prisma' | take 20"
```

**Expected Results**:
- All Prisma tables exist (User, Alert, IncidentReport, AdminUser, etc.)
- No connection errors in Application Insights
- Functions can query database successfully

**Troubleshooting**:
- If connection fails, verify `DATABASE_URL` includes `sslaccept=strict`
- Check MySQL firewall rules allow Azure services
- Verify admin password is correct

---

### 4. Create Initial Admin User ⏱️ 10 minutes

**Why**: Need admin account to test admin endpoints and dashboard  
**Status**: No admin users created yet

**Tasks**:
- [ ] Create admin user in database
- [ ] Test admin login
- [ ] Verify admin endpoints work

**Commands**:
```bash
# Option 1: Use Prisma Studio (easiest)
cd backend
npx prisma studio
# Opens web UI at http://localhost:5555
# Create AdminUser record with hashed password

# Option 2: Direct SQL
mysql -h jamalerthackathon.mysql.database.azure.com \
  -u adminjamalert -p \
  --ssl-mode=REQUIRED \
  jamalert \
  -e "INSERT INTO AdminUser (id, email, password, name, role, active, createdAt, updatedAt) VALUES (UUID(), 'admin@jamalert.com', '\$2b\$10\$hash', 'Admin', 'SUPER_ADMIN', true, NOW(), NOW());"

# Generate bcrypt hash for password (use Node.js):
node -e "console.log(require('bcrypt').hashSync('<PASSWORD>', 10))"
```

**Test Admin Login**:
```bash
curl -X POST https://jamalert-hackathon.azurewebsites.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@jamalert.com",
    "password": "<PASSWORD>"
  }'
```

**Expected Result**: JSON with JWT token and user info

---

## 🟡 Priority 2: Important Steps

### 5. Update Vercel Frontend Environment Variables ⏱️ 15 minutes

**Why**: Frontend needs to connect to new backend API  
**Status**: Frontend likely pointing to old/local backend

**Tasks**:
- [ ] Update `NEXT_PUBLIC_API_URL` in Vercel
- [ ] Update any other backend-related variables
- [ ] Redeploy frontend to apply changes

**Commands**:
```bash
# Via Vercel CLI
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://jamalert-hackathon.azurewebsites.net/api

# Or via Vercel Dashboard:
# 1. Go to https://vercel.com/your-username/jamalert-hackathon
# 2. Settings > Environment Variables
# 3. Add/Update NEXT_PUBLIC_API_URL
# 4. Redeploy from Deployments tab
```

**Verify**:
```bash
# Check frontend is using correct API
curl https://your-frontend.vercel.app/_next/static/chunks/main.js | grep -o "jamalert-hackathon.azurewebsites.net"
```

---

### 6. Re-enable and Fix Tests in Workflow ⏱️ 2 hours

**Why**: Tests were temporarily disabled to unblock deployment  
**Status**: Tests commented out in GitHub Actions workflow

**Current Test Issues**:
1. Missing `communities` property in Alert type definitions
2. Headers mock in `incidents-report.test.ts` incomplete
3. Readonly property errors in request mocks

**Tasks**:
- [ ] Re-enable `npm run test` in workflow
- [ ] Fix TypeScript test errors:
  - [ ] Update Alert type to include `communities?: Json | null`
  - [ ] Fix all test mocks to include communities property
  - [ ] Fix Headers interface mocks
  - [ ] Fix readonly request property issues
- [ ] Verify all tests pass locally
- [ ] Update workflow and push

**Files to Update**:
- `.github/workflows/master_jamalert-hackathon.yml` - Re-add test step
- `backend/src/types/alert.types.ts` - Fix Alert interface
- `backend/src/functions/__tests__/alerts-integration.test.ts` - Fix mocks
- `backend/src/services/__tests__/alert.service.test.ts` - Fix mocks
- `backend/src/functions/__tests__/incidents-report.test.ts` - Fix Headers mock

**Workflow Change**:
```yaml
# Re-add this line to the workflow after line 36:
- name: 'Run Tests'
  shell: bash
  run: |
    pushd './${{ env.AZURE_FUNCTIONAPP_PACKAGE_PATH }}'
    npm run test
    popd
```

---

### 7. Configure External Monitoring ⏱️ 30 minutes

**Why**: Proactively detect issues and monitor uptime  
**Status**: No external monitoring configured

**Tasks**:
- [ ] Set up Application Insights alerts
- [ ] Configure availability tests
- [ ] Set up notification channels

**Azure Portal Steps**:
1. Go to Application Insights > Availability
2. Add availability test:
   - Name: "Health Check"
   - URL: https://jamalert-hackathon.azurewebsites.net/api/admin/health
   - Frequency: 5 minutes
   - Alert on: 3 consecutive failures
3. Configure alert action group:
   - Email: your-email@domain.com
   - SMS: Optional

**Application Insights Queries** (for monitoring):
```kusto
// Failed requests in last hour
requests
| where timestamp > ago(1h) and success == false
| summarize count() by resultCode, name
| order by count_ desc

// Slow requests (>1s) in last hour  
requests
| where timestamp > ago(1h) and duration > 1000
| project timestamp, name, duration, resultCode
| order by duration desc

// Exception rate
exceptions
| where timestamp > ago(1h)
| summarize count() by type, outerMessage
| order by count_ desc
```

---

### 8. Test End-to-End User Flows ⏱️ 1 hour

**Why**: Verify the complete system works as intended  
**Status**: Individual components verified, but not full flows

**Test Scenarios**:

#### A. User Registration & Alerts
- [ ] Register new user via frontend/API
- [ ] User receives welcome email
- [ ] Create alert for user's location
- [ ] Verify user receives alert via email/SMS
- [ ] Check alert delivery logs

#### B. Incident Reporting
- [ ] User reports incident via frontend
- [ ] Incident appears in admin dashboard
- [ ] Admin can view incident details
- [ ] Incident appears on map

#### C. Admin Dashboard
- [ ] Admin can login
- [ ] Dashboard shows statistics
- [ ] Admin can view all users
- [ ] Admin can send manual alerts
- [ ] Admin can view alert history

#### D. Weather Monitoring
- [ ] Trigger weather check manually
- [ ] Verify weather data is fetched
- [ ] Check weather thresholds
- [ ] Simulate threshold breach
- [ ] Verify automated alert is sent

**Test Commands**:
```bash
# Test user registration
curl -X POST https://jamalert-hackathon.azurewebsites.net/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "+15555551234",
    "address": "123 Test St",
    "coordinates": {"lat": 43.6532, "lng": -79.3832}
  }'

# Test incident report
curl -X POST https://jamalert-hackathon.azurewebsites.net/api/incidents/report \
  -H "Content-Type: application/json" \
  -d '{
    "type": "FLOOD",
    "description": "Water rising on Main St",
    "location": {"lat": 43.6532, "lng": -79.3832},
    "severity": "MEDIUM"
  }'

# Trigger weather check (requires admin token)
curl -X POST https://jamalert-hackathon.azurewebsites.net/api/admin/weather/check \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

## 🟢 Priority 3: Optional Enhancements

### 9. Optimize Performance ⏱️ 1 hour

**Tasks**:
- [ ] Review Application Insights performance metrics
- [ ] Optimize slow database queries
- [ ] Add Redis cache for frequently accessed data (optional)
- [ ] Configure Azure CDN for static assets (optional)

---

### 10. Security Hardening ⏱️ 1 hour

**Tasks**:
- [ ] Review and restrict CORS origins
- [ ] Add rate limiting to public endpoints
- [ ] Enable Azure Firewall (if needed)
- [ ] Review and update JWT expiration times
- [ ] Set up Azure Key Vault for secrets (recommended)
- [ ] Enable Azure DDoS Protection (optional, paid)

---

### 11. Documentation Updates ⏱️ 30 minutes

**Tasks**:
- [ ] Update API documentation with live URLs
- [ ] Add Postman/Thunder Client collection
- [ ] Document common error codes and solutions
- [ ] Create runbook for common operations

---

### 12. Backup and Disaster Recovery ⏱️ 45 minutes

**Tasks**:
- [ ] Set up automated database backups
- [ ] Document recovery procedures
- [ ] Test backup restoration process
- [ ] Set up geo-redundant storage (optional)

---

## 📊 Execution Timeline

### Week 1 (Immediate)
- **Day 1**: Steps 1-4 (Verify, Configure, Test, Create Admin) - 2 hours
- **Day 2**: Step 5 (Update Vercel) - 15 minutes
- **Day 3**: Step 8 (End-to-End Testing) - 1 hour
- **Day 4**: Step 7 (Monitoring) - 30 minutes

### Week 2 (Important)
- **Day 5-6**: Step 6 (Re-enable Tests) - 2 hours
- **Day 7**: Review and finalize

### Week 3+ (Optional)
- Steps 9-12 as time permits

---

## 📈 Success Metrics

After completing Priority 1 & 2 steps, you should have:
- ✅ All 32 Azure Functions responding correctly
- ✅ Database connected and queryable
- ✅ Admin dashboard accessible
- ✅ Users can register and receive alerts
- ✅ Email notifications working
- ✅ SMS notifications working (if Twilio configured)
- ✅ Weather monitoring operational
- ✅ Frontend connected to backend
- ✅ Tests passing in CI/CD
- ✅ Monitoring and alerts configured

---

## 🆘 Troubleshooting Resources

### Common Issues

**Functions return 404**:
- Wait 10 minutes for cold start
- Check Azure Portal: Function App > Functions (verify all 32 listed)
- Check deployment logs in GitHub Actions

**Database connection errors**:
- Verify `DATABASE_URL` format includes `?sslaccept=strict`
- Check MySQL firewall allows Azure services
- Test connection directly with mysql client

**Email not sending**:
- Verify SMTP credentials in environment variables
- Check spam folder
- Review Application Insights for SMTP errors
- Test with simple SMTP test tool

**Weather monitoring not working**:
- Verify `WEATHER_API_KEY` is set
- Check OpenWeather API quota (1,000/day free)
- Review Application Insights for API errors

### Support Channels
- **Azure Documentation**: https://docs.microsoft.com/azure/azure-functions/
- **Prisma Documentation**: https://www.prisma.io/docs/
- **GitHub Issues**: Create issue in repository
- **Application Insights**: Real-time error logs and traces

---

## 📝 Notes

- All times are estimates and may vary based on experience level
- Some steps can be parallelized (e.g., configuring email while waiting for functions to initialize)
- Keep credentials secure and never commit them to repository
- Document all API keys and credentials in secure password manager

---

**Last Updated**: October 26, 2025  
**Next Review**: After completing Priority 1 steps
