# Railway Deployment Guide for JAMALERT

## 🚂 Overview

This guide walks you through deploying the JAMALERT backend to Railway as an alternative to Azure.

**Deployment Time:** 30-60 minutes  
**Cost:** $5-50/month (usage-based)  
**Difficulty:** Easy

---

## 📋 Prerequisites

- [ ] Railway account (sign up at https://railway.app)
- [ ] GitHub account (for connecting repository)
- [ ] Basic understanding of environment variables
- [ ] JAMALERT repository access

---

## 🚀 Quick Start (5 Minutes)

### Option 1: Deploy from GitHub (Recommended)

1. **Go to Railway Dashboard**
   - Visit https://railway.app/dashboard
   - Click "New Project"

2. **Deploy from GitHub**
   - Select "Deploy from GitHub repo"
   - Choose your JAMALERT repository
   - Railway will auto-detect the Express.js app

3. **Add MySQL Database**
   - Click "New" → "Database" → "Add MySQL"
   - Railway automatically creates `DATABASE_URL` environment variable

4. **Configure Environment Variables**
   - Go to your service → "Variables" tab
   - Add required variables (see Environment Variables section)

5. **Deploy**
   - Railway automatically deploys on push to main branch
   - Get your deployment URL: `https://your-app.up.railway.app`

### Option 2: Deploy with Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project
railway init

# Link to your Railway project
railway link

# Add MySQL database
railway add mysql

# Set environment variables
railway variables set JWT_SECRET="your-secret-key"
railway variables set OPENWEATHER_API_KEY="your-api-key"
# ... add other variables

# Deploy
railway up
```

---

## 🔧 Detailed Setup

### Step 1: Create Railway Project

1. **Sign up for Railway**
   - Go to https://railway.app
   - Sign up with GitHub (recommended)
   - Verify your email

2. **Create New Project**
   - Click "New Project" button
   - Choose "Deploy from GitHub repo"
   - Authorize Railway to access your GitHub

3. **Select Repository**
   - Find and select your JAMALERT repository
   - Railway will scan for deployable services

### Step 2: Configure Service

1. **Set Root Directory**
   - Go to Settings → "Root Directory"
   - Set to: `backend/express-app`
   - This tells Railway where your Express app is located

2. **Configure Build Settings**
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Railway auto-detects these from `package.json`

3. **Set Port**
   - Railway automatically sets `PORT` environment variable
   - Your Express app should use: `process.env.PORT || 8000`

### Step 3: Add MySQL Database

1. **Add Database Service**
   - In your project, click "New" → "Database"
   - Select "Add MySQL"
   - Railway provisions a MySQL 8.0 instance

2. **Get Database Credentials**
   - Railway automatically creates `DATABASE_URL` variable
   - Format: `mysql://user:password@host:port/database`
   - This is automatically injected into your app

3. **Verify Database Connection**
   - Check "Variables" tab to see `DATABASE_URL`
   - Should look like: `mysql://root:***@containers-us-west-123.railway.app:3306/railway`

### Step 4: Configure Environment Variables

Add these variables in Railway Dashboard → Variables:

**Required Variables:**
```bash
# Database (automatically provided by Railway)
DATABASE_URL=mysql://...

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Email (SendGrid)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM_EMAIL=noreply@jamalert.jm
SMTP_FROM_NAME=JamAlert

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Weather API
OPENWEATHER_API_KEY=your-openweather-api-key

# Application
NODE_ENV=production
CORS_ORIGINS=https://jamalert.vercel.app
```

**Optional Variables:**
```bash
# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=info

# Feature Flags
ENABLE_SMS_NOTIFICATIONS=true
ENABLE_EMAIL_NOTIFICATIONS=true
ENABLE_WEATHER_INTEGRATION=true
```

### Step 5: Run Database Migrations

1. **Connect to Railway via CLI**
   ```bash
   railway login
   railway link
   ```

2. **Run Prisma Migrations**
   ```bash
   # Generate Prisma client
   railway run npx prisma generate

   # Run migrations
   railway run npx prisma migrate deploy

   # Seed database (optional)
   railway run npx prisma db seed
   ```

3. **Verify Database**
   ```bash
   # Open database shell
   railway connect mysql

   # Check tables
   SHOW TABLES;
   ```

### Step 6: Deploy and Test

1. **Trigger Deployment**
   - Push to GitHub main branch
   - Or click "Deploy" in Railway dashboard
   - Watch build logs in real-time

2. **Get Deployment URL**
   - Go to Settings → "Domains"
   - Railway provides: `https://your-app.up.railway.app`
   - Or add custom domain

3. **Test API Endpoints**
   ```bash
   # Health check
   curl https://your-app.up.railway.app/api/health

   # Get alerts
   curl https://your-app.up.railway.app/api/alerts

   # Test authentication
   curl -X POST https://your-app.up.railway.app/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

---

## 🔄 Updating Vercel Frontend

After Railway deployment, update Vercel to use Railway backend:

### Option 1: Use Railway as Primary

```bash
# In Vercel Dashboard → Environment Variables
NEXT_PUBLIC_BACKEND_PROVIDER=railway
NEXT_PUBLIC_RAILWAY_API_URL=https://your-app.up.railway.app/api
```

### Option 2: Use Railway as Fallback

```bash
# Keep Azure as primary, Railway as backup
NEXT_PUBLIC_BACKEND_PROVIDER=azure
NEXT_PUBLIC_ENABLE_BACKEND_FAILOVER=true
NEXT_PUBLIC_RAILWAY_API_URL=https://your-app.up.railway.app/api
NEXT_PUBLIC_RAILWAY_FALLBACK_URL=https://your-app-staging.up.railway.app/api
```

### Option 3: Auto-Select

```bash
# Automatically choose best available backend
NEXT_PUBLIC_BACKEND_PROVIDER=auto
NEXT_PUBLIC_ENABLE_BACKEND_FAILOVER=true
```

---

## 💰 Cost Management

### Railway Pricing Tiers

**Hobby Plan ($5/month)**
- $5 minimum spend (includes $5 usage credits)
- Up to 8 GB RAM / 8 vCPU per service
- 5 GB volume storage
- Perfect for development/staging

**Pro Plan ($20/month)**
- $20 minimum spend (includes $20 usage credits)
- Up to 32 GB RAM / 32 vCPU per service
- 250 GB volume storage
- Priority support

### Usage-Based Pricing

- **Memory**: $0.000386/GB-hour (~$0.28/GB-month)
- **CPU**: $0.000772/vCPU-hour (~$0.56/vCPU-month)
- **Volumes**: $0.00000006/GB-sec (~$0.15/GB-month)
- **Egress**: $0.05/GB

### Estimated Costs for JAMALERT

**Development Environment:**
- Express App: 512 MB RAM, 0.5 vCPU = ~$2/month
- MySQL Database: 512 MB RAM = ~$1.50/month
- **Total: ~$5/month (covered by Hobby plan)**

**Production Environment:**
- Express App: 1 GB RAM, 1 vCPU = ~$5/month
- MySQL Database: 2 GB RAM = ~$6/month
- Egress (10 GB): ~$0.50/month
- **Total: ~$12/month**

### Cost Optimization Tips

1. **Use Hobby Plan for Development**
   - Free $5 credits cover small apps
   - Scale to Pro only when needed

2. **Monitor Resource Usage**
   - Check Metrics tab regularly
   - Adjust resources based on actual usage

3. **Use Staging Environment Wisely**
   - Pause staging when not in use
   - Or use smaller resources for staging

4. **Optimize Database**
   - Regular cleanup of old data
   - Use indexes for better performance
   - Monitor query performance

---

## 🔍 Monitoring & Debugging

### View Logs

```bash
# Via CLI
railway logs

# Via Dashboard
# Go to your service → "Deployments" → Click deployment → "View Logs"
```

### Monitor Metrics

- **CPU Usage**: Dashboard → Metrics → CPU
- **Memory Usage**: Dashboard → Metrics → Memory
- **Network**: Dashboard → Metrics → Network

### Common Issues

**Issue: Database connection failed**
```bash
# Solution: Check DATABASE_URL format
railway variables get DATABASE_URL

# Should be: mysql://user:pass@host:port/db
# Update Prisma schema if needed
```

**Issue: Build failed**
```bash
# Solution: Check build logs
railway logs --deployment <deployment-id>

# Common fixes:
# 1. Ensure package.json has correct scripts
# 2. Check Node version compatibility
# 3. Verify all dependencies are listed
```

**Issue: App crashes on startup**
```bash
# Solution: Check start command
# Settings → Start Command should be: npm start

# Verify server.js uses PORT env variable
const PORT = process.env.PORT || 8000;
```

---

## 🚀 Advanced Configuration

### Custom Domain

1. Go to Settings → "Domains"
2. Click "Add Domain"
3. Enter your domain (e.g., `api.jamalert.jm`)
4. Add CNAME record to your DNS:
   ```
   CNAME api.jamalert.jm -> your-app.up.railway.app
   ```

### Environment-Specific Deployments

Create separate Railway projects for each environment:

- **Production**: `jamalert-production`
- **Staging**: `jamalert-staging`
- **Development**: `jamalert-dev`

### Automatic Deployments

Railway automatically deploys on:
- Push to connected branch (default: main)
- Pull request merges
- Manual trigger in dashboard

Configure in Settings → "Deployments"

---

## 📚 Next Steps

1. ✅ Deploy to Railway
2. ✅ Configure environment variables
3. ✅ Run database migrations
4. ✅ Test all API endpoints
5. ✅ Update Vercel frontend configuration
6. ✅ Monitor logs and metrics
7. ✅ Set up custom domain (optional)
8. ✅ Configure automatic backups

---

## 🆘 Troubleshooting

### Get Help

- **Railway Discord**: https://discord.gg/railway
- **Railway Docs**: https://docs.railway.app
- **Email Support**: help@railway.app
- **Status Page**: https://status.railway.app

### Useful Commands

```bash
# View all variables
railway variables

# Set variable
railway variables set KEY=value

# Delete variable
railway variables delete KEY

# View service info
railway status

# Open dashboard
railway open

# Connect to database
railway connect mysql
```

---

**Last Updated:** 2025-10-22  
**Version:** 1.0

