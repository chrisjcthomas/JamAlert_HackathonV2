# 🚂 Railway Deployment Progress Guide
## JAMALERT Backend Deployment - Current Status & Next Steps

**Last Updated:** October 22, 2025  
**Deployment Status:** 🟡 In Progress - Configuration Required  
**Deployed By:** sewelljsheriann@gmail.com

---

## 📊 Current Deployment Status

### ✅ Completed Steps

1. **Railway CLI Installation**
   - ✅ Railway CLI v4.11.0 installed successfully
   - ✅ Authenticated as: sewelljsheriann@gmail.com
   - ✅ Command: `npm install -g @railway/cli`

2. **Railway Project Creation**
   - ✅ Project Name: **JAMALERT-Backend**
   - ✅ Project ID: `39e60b66-b58f-4f1b-b868-9b9f10a3a70c`
   - ✅ Project URL: https://railway.com/project/39e60b66-b58f-4f1b-b868-9b9f10a3a70c
   - ✅ Workspace: Sheriann Sewell's Projects
   - ✅ Environment: production

3. **MySQL Database Provisioned**
   - ✅ MySQL 9.4.0 database added to project
   - ✅ Database name: `railway`
   - ✅ Database is running and ready

4. **Backend Service Created**
   - ✅ Express.js backend service created
   - ✅ Service ID: `b55ea430-8df8-4c38-aaf1-d19620160895`
   - ✅ Initial deployment attempted
   - ✅ `railway.json` configuration file created

### 🟡 Pending Steps

1. **Configure Environment Variables** (REQUIRED)
2. **Generate Public Domain** (REQUIRED)
3. **Run Prisma Database Migrations** (REQUIRED)
4. **Verify Deployment** (REQUIRED)
5. **Update Vercel Frontend** (REQUIRED)

---

## 🔐 Railway Project Details

### Project Information

| Property | Value |
|----------|-------|
| **Project Name** | JAMALERT-Backend |
| **Project ID** | 39e60b66-b58f-4f1b-b868-9b9f10a3a70c |
| **Project URL** | https://railway.com/project/39e60b66-b58f-4f1b-b868-9b9f10a3a70c |
| **Environment** | production |
| **Owner** | sewelljsheriann@gmail.com |

### MySQL Database Details

| Property | Value |
|----------|-------|
| **Database Name** | railway |
| **Database User** | root |
| **Database Password** | `LLYJigIftWEebBlVfLMMoLWTUIqeMqfv` |
| **Internal Host** | mysql.railway.internal |
| **Public Host** | maglev.proxy.rlwy.net |
| **Public Port** | 45256 |
| **Internal Port** | 3306 |

### Database Connection Strings

**Public URL (for external connections):**
```
mysql://root:LLYJigIftWEebBlVfLMMoLWTUIqeMqfv@maglev.proxy.rlwy.net:45256/railway
```

**Internal URL (for Railway services):**
```
mysql://root:LLYJigIftWEebBlVfLMMoLWTUIqeMqfv@mysql.railway.internal:3306/railway
```

**⚠️ IMPORTANT:** Use the **Public URL** for the `DATABASE_URL` environment variable in the backend service.

---

## 📋 Step-by-Step Completion Guide

### Step 1: Access Railway Dashboard

1. Open your browser and navigate to:
   ```
   https://railway.com/project/39e60b66-b58f-4f1b-b868-9b9f10a3a70c
   ```

2. You should see two services:
   - **MySQL** - Database service (already configured ✅)
   - **express-app** (or similar name) - Backend service (needs configuration 🟡)

### Step 2: Configure Backend Service Environment Variables

1. **Click on the backend service** (express-app)

2. **Navigate to the "Variables" tab**

3. **Add the following environment variables** (click "+ New Variable" for each):

```bash
# Database Connection
DATABASE_URL=mysql://root:LLYJigIftWEebBlVfLMMoLWTUIqeMqfv@maglev.proxy.rlwy.net:45256/railway

# Authentication
JWT_SECRET=jamalert-production-secret-key-2025-change-this-later
JWT_EXPIRES_IN=7d

# Application Settings
NODE_ENV=production
PORT=8000

# API Keys
OPENWEATHER_API_KEY=cda9eb2ef470b557b4fdb77332f5e9e7

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,https://jamalert.vercel.app

# Feature Flags
ENABLE_SMS_NOTIFICATIONS=false
ENABLE_EMAIL_NOTIFICATIONS=false
ENABLE_PUSH_NOTIFICATIONS=false
ENABLE_WEATHER_INTEGRATION=true
ENABLE_ADMIN_DASHBOARD=true

# Logging
LOG_LEVEL=info
ENABLE_REQUEST_LOGGING=true

# Weather Configuration
WEATHER_CACHE_TTL_MINUTES=5
WEATHER_CHECK_INTERVAL_MINUTES=15

# Flash Flood Warning System
USE_PREDICTIVE_ALERTS=false
SHADOW_MODE_LOGGING=true

# Rainfall Thresholds (Jamaica defaults)
RAINFALL_THRESHOLD_1H=50
RAINFALL_THRESHOLD_3H=75
RAINFALL_THRESHOLD_12H=150
RAINFALL_THRESHOLD_24H=200
```

4. **Click "Add" or "Save"** after entering all variables

### Step 3: Generate Public Domain

1. While still in the backend service view, **navigate to the "Settings" tab**

2. Scroll down to the **"Networking"** section

3. Click **"Generate Domain"** button

4. Railway will generate a public URL like:
   ```
   https://jamalert-backend-production.up.railway.app
   ```
   or
   ```
   https://express-app-production-xxxx.up.railway.app
   ```

5. **📝 IMPORTANT: Copy and save this URL** - you'll need it for:
   - Updating Vercel frontend environment variables
   - Testing the backend
   - API documentation

### Step 4: Redeploy the Service

1. Go to the **"Deployments" tab**

2. If the latest deployment failed or is pending:
   - Click the **"⋮" (three dots)** menu on the latest deployment
   - Select **"Redeploy"**

3. If no deployment exists:
   - Click **"Deploy"** button

4. **Monitor the build logs** to ensure successful deployment:
   - Build should complete without errors
   - Look for: "Build successful" or "Deployment successful"
   - Service should show as "Active" with a green indicator

### Step 5: Run Prisma Database Migrations

**Option A: Using Railway CLI (Recommended)**

1. Open terminal in the project root directory

2. Navigate to backend directory:
   ```powershell
   cd JamAlert_HackathonV2/backend/express-app
   ```

3. Link to the backend service:
   ```powershell
   railway service
   ```
   Select the **express-app** service (not MySQL)

4. Run Prisma migrations:
   ```powershell
   railway run npx prisma migrate deploy
   ```

5. Generate Prisma Client:
   ```powershell
   railway run npx prisma generate
   ```

**Option B: Using Railway Dashboard**

1. In the backend service, go to **"Settings" tab**

2. Scroll to **"Deploy"** section

3. Add to **"Build Command"**:
   ```
   npm install && npx prisma generate && npx prisma migrate deploy
   ```

4. Redeploy the service

### Step 6: Verify Deployment

1. **Check Service Status**
   - In Railway dashboard, backend service should show **"Active"** status
   - No error logs in the "Logs" tab

2. **Test Health Endpoint**
   
   Open your browser or use curl to test:
   ```bash
   https://[YOUR-RAILWAY-DOMAIN]/api/health
   ```
   
   Expected response:
   ```json
   {
     "status": "ok",
     "timestamp": "2025-10-22T...",
     "service": "jamalert-api",
     "version": "1.0.0"
   }
   ```

3. **Test Database Connection**
   ```bash
   https://[YOUR-RAILWAY-DOMAIN]/api/incidents
   ```
   
   Should return incidents data (may be empty array if no data yet)

4. **Check Logs**
   - Go to "Logs" tab in Railway dashboard
   - Look for: "Server running on port 8000" or similar
   - No database connection errors

---

## 🔄 Post-Deployment Tasks

### Task 1: Update Vercel Frontend Environment Variables

1. Go to Vercel dashboard: https://vercel.com/

2. Select the **JAMALERT** project

3. Go to **Settings** → **Environment Variables**

4. Add/Update these variables:

```bash
NEXT_PUBLIC_BACKEND_PROVIDER=railway
NEXT_PUBLIC_RAILWAY_API_URL=https://[YOUR-RAILWAY-DOMAIN]/api
NEXT_PUBLIC_ENABLE_BACKEND_FAILOVER=true
```

5. **Redeploy** the Vercel frontend to apply changes

### Task 2: Test Frontend-Backend Connection

1. Open the Vercel frontend: https://jamalert.vercel.app/

2. Test the following features:
   - ✅ View incidents on map
   - ✅ Create new incident (if logged in)
   - ✅ View incident details
   - ✅ Weather integration
   - ✅ User authentication (login/register)

3. Check browser console for any API errors

### Task 3: Document Final URLs

**📝 Record these URLs for future reference:**

| Service | URL |
|---------|-----|
| **Railway Backend** | https://[YOUR-RAILWAY-DOMAIN] |
| **Railway API** | https://[YOUR-RAILWAY-DOMAIN]/api |
| **Railway Health Check** | https://[YOUR-RAILWAY-DOMAIN]/api/health |
| **Vercel Frontend** | https://jamalert.vercel.app |
| **Railway Dashboard** | https://railway.com/project/39e60b66-b58f-4f1b-b868-9b9f10a3a70c |

---

## 🔧 Troubleshooting

### Issue: Deployment Fails with "Build Error"

**Solution:**
1. Check build logs in Railway dashboard
2. Ensure `package.json` has correct dependencies
3. Verify `railway.json` build command is correct
4. Try manual build: `railway run npm install`

### Issue: Database Connection Error

**Symptoms:**
- Logs show: "Error: connect ECONNREFUSED" or "Can't reach database server"

**Solution:**
1. Verify `DATABASE_URL` environment variable is set correctly
2. Use the **Public URL**, not internal URL
3. Ensure MySQL service is running (check Railway dashboard)
4. Test connection: `railway run npx prisma db pull`

### Issue: "Port already in use" Error

**Solution:**
1. Railway automatically assigns ports - don't hardcode port 8000
2. Update `server.js` to use: `const PORT = process.env.PORT || 8000`
3. Ensure `PORT` environment variable is set to `8000` in Railway

### Issue: CORS Errors in Frontend

**Symptoms:**
- Browser console shows: "Access-Control-Allow-Origin" error

**Solution:**
1. Verify `CORS_ORIGINS` includes `https://jamalert.vercel.app`
2. Check backend logs for CORS configuration
3. Ensure Express CORS middleware is properly configured

### Issue: Prisma Migration Fails

**Solution:**
1. Check if database is accessible: `railway run npx prisma db pull`
2. Verify `DATABASE_URL` format is correct
3. Run migrations manually: `railway run npx prisma migrate deploy`
4. Check Prisma schema for syntax errors

---

## 📞 Support & Resources

### Railway Documentation
- **Getting Started:** https://docs.railway.app/getting-started
- **Environment Variables:** https://docs.railway.app/develop/variables
- **Deployments:** https://docs.railway.app/deploy/deployments
- **Databases:** https://docs.railway.app/databases/mysql

### Project Documentation
- **Main Deployment Guide:** `RAILWAY_DEPLOYMENT_GUIDE.md`
- **Dual Deployment Strategy:** `DUAL_DEPLOYMENT_STRATEGY.md`
- **Migration Guide:** `MIGRATION_GUIDE.md`

### Quick Commands Reference

```powershell
# Check Railway status
railway status

# View logs
railway logs

# Run commands in Railway environment
railway run [command]

# Deploy
railway up

# Link to service
railway service

# View environment variables
railway variables
```

---

## ✅ Deployment Checklist

Use this checklist to track your progress:

- [x] Railway CLI installed and authenticated
- [x] Railway project created (JAMALERT-Backend)
- [x] MySQL database provisioned
- [x] Backend service created
- [ ] Environment variables configured
- [ ] Public domain generated
- [ ] Service deployed successfully
- [ ] Prisma migrations run
- [ ] Health endpoint responding
- [ ] Database connection verified
- [ ] Vercel frontend updated
- [ ] Frontend-backend connection tested
- [ ] Final URLs documented

---

## 🎯 Success Criteria

Your deployment is successful when:

1. ✅ Railway backend service shows "Active" status
2. ✅ Health endpoint returns `{"status": "ok"}`
3. ✅ Database queries work (incidents endpoint returns data)
4. ✅ Vercel frontend can communicate with Railway backend
5. ✅ No errors in Railway logs
6. ✅ CORS is properly configured
7. ✅ All environment variables are set

---

**Next Steps After Successful Deployment:**

1. Monitor Railway logs for any runtime errors
2. Set up monitoring/alerting (optional)
3. Configure custom domain (optional)
4. Set up CI/CD pipeline (optional)
5. Review and optimize database queries
6. Consider upgrading Railway plan if needed

**Good luck with your deployment! 🚀**

