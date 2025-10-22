# JAMALERT Platform Migration Guide

## 🔄 Overview

This guide covers migrating JAMALERT between Azure and Railway platforms with minimal downtime.

---

## 📋 Migration Scenarios

### Scenario 1: Azure → Railway
**Use Case:** Cost reduction, simpler operations  
**Downtime:** 0-5 minutes (with blue-green deployment)  
**Effort:** Low-Medium (1-2 weeks)

### Scenario 2: Railway → Azure
**Use Case:** Scale up, compliance requirements  
**Downtime:** 0-5 minutes (with blue-green deployment)  
**Effort:** Medium (2-4 weeks)

### Scenario 3: Dual Deployment
**Use Case:** Testing, high availability  
**Downtime:** 0 minutes  
**Effort:** Medium (initial setup), Low (maintenance)

---

## 🚀 Migration Strategy: Azure → Railway

### Pre-Migration Checklist

- [ ] Railway account created
- [ ] Railway CLI installed
- [ ] Database backup completed
- [ ] Environment variables documented
- [ ] API endpoints tested
- [ ] Rollback plan prepared
- [ ] Team notified of migration window

### Phase 1: Preparation (Week 1)

#### 1.1 Set Up Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Add MySQL database
railway add mysql
```

#### 1.2 Configure Environment Variables

```bash
# Copy from Azure to Railway
# Get Azure variables
az functionapp config appsettings list \
  --name jamalert-prod-func \
  --resource-group jamalert-prod-rg

# Set in Railway
railway variables set JWT_SECRET="..."
railway variables set SMTP_HOST="..."
railway variables set TWILIO_ACCOUNT_SID="..."
# ... etc
```

#### 1.3 Export Azure Database

```bash
# Export from Azure MySQL
mysqldump -h jamalert-prod-mysql.mysql.database.azure.com \
  -u adminuser -p \
  --databases jamalert \
  --single-transaction \
  --quick \
  --lock-tables=false \
  > jamalert_backup_$(date +%Y%m%d).sql

# Compress backup
gzip jamalert_backup_*.sql
```

### Phase 2: Deploy to Railway (Week 2)

#### 2.1 Deploy Application

```bash
# Deploy Express backend
cd backend/express-app
railway up

# Wait for deployment
railway logs --follow
```

#### 2.2 Import Database

```bash
# Get Railway MySQL connection details
railway variables get DATABASE_URL

# Import data
gunzip < jamalert_backup_*.sql.gz | \
  mysql -h railway-host -u root -p railway

# Verify import
railway run npx prisma db pull
```

#### 2.3 Run Migrations

```bash
# Generate Prisma client
railway run npx prisma generate

# Run migrations
railway run npx prisma migrate deploy

# Verify schema
railway run npx prisma db pull
```

### Phase 3: Testing (Days 1-3)

#### 3.1 Smoke Tests

```bash
# Get Railway URL
RAILWAY_URL=$(railway domain)

# Test health endpoint
curl https://$RAILWAY_URL/api/health

# Test authentication
curl -X POST https://$RAILWAY_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Test alerts
curl https://$RAILWAY_URL/api/alerts
```

#### 3.2 Load Testing

```bash
# Install k6 (load testing tool)
# Windows: choco install k6
# Mac: brew install k6

# Run load test
k6 run tests/load-test.js
```

#### 3.3 Data Validation

```sql
-- Connect to Railway MySQL
railway connect mysql

-- Verify record counts
SELECT 'users' as table_name, COUNT(*) as count FROM User
UNION ALL
SELECT 'alerts', COUNT(*) FROM Alert
UNION ALL
SELECT 'incidents', COUNT(*) FROM Incident;

-- Compare with Azure counts
```

### Phase 4: Cutover (Day 4)

#### 4.1 Blue-Green Deployment

```bash
# Update Vercel environment variables
# Option 1: Gradual rollout (recommended)
NEXT_PUBLIC_BACKEND_PROVIDER=auto
NEXT_PUBLIC_AZURE_API_URL=https://azure-url/api
NEXT_PUBLIC_RAILWAY_API_URL=https://railway-url/api
NEXT_PUBLIC_ENABLE_BACKEND_FAILOVER=true

# Option 2: Immediate switch
NEXT_PUBLIC_BACKEND_PROVIDER=railway
NEXT_PUBLIC_RAILWAY_API_URL=https://railway-url/api
```

#### 4.2 Monitor Cutover

```bash
# Watch Railway logs
railway logs --follow

# Monitor error rates
# Check Vercel Analytics
# Check Railway Metrics dashboard
```

#### 4.3 Verify Traffic

```bash
# Check Railway metrics
railway status

# Verify all features working
# - User authentication
# - Alert creation
# - Incident reporting
# - Email notifications
# - SMS notifications
```

### Phase 5: Post-Migration (Week 3)

#### 5.1 Monitor Performance

- [ ] Response times acceptable (< 500ms)
- [ ] Error rate low (< 1%)
- [ ] Database performance good
- [ ] No user complaints
- [ ] All features working

#### 5.2 Optimize

```bash
# Review Railway metrics
railway metrics

# Optimize database queries
# Add indexes if needed
railway run npx prisma db execute --file optimize.sql

# Adjust resources if needed
# Railway Dashboard → Settings → Resources
```

#### 5.3 Decommission Azure (Optional)

**Wait 2-4 weeks before decommissioning Azure!**

```bash
# Final backup from Azure
mysqldump -h azure-mysql-host -u admin -p jamalert > final_backup.sql

# Delete Azure resources
az group delete --name jamalert-prod-rg --yes

# Cancel Azure subscriptions if no longer needed
```

---

## 🚀 Migration Strategy: Railway → Azure

### Pre-Migration Checklist

- [ ] Azure subscription active
- [ ] Azure CLI installed
- [ ] Database backup completed
- [ ] Bicep templates ready
- [ ] Environment variables documented
- [ ] Rollback plan prepared

### Phase 1: Preparation (Week 1-2)

#### 1.1 Set Up Azure Resources

```powershell
# Login to Azure
az login

# Create resource group
az group create --name jamalert-prod-rg --location eastus

# Deploy infrastructure
cd infrastructure/azure
az deployment group create `
  --name jamalert-deployment `
  --resource-group jamalert-prod-rg `
  --template-file main.bicep `
  --parameters environment=prod
```

#### 1.2 Configure Azure Services

```powershell
# Get Azure MySQL connection string
$mysqlHost = az mysql flexible-server show `
  --name jamalert-prod-mysql `
  --resource-group jamalert-prod-rg `
  --query "fullyQualifiedDomainName" -o tsv

# Configure Function App settings
az functionapp config appsettings set `
  --name jamalert-prod-func `
  --resource-group jamalert-prod-rg `
  --settings @appsettings.json
```

#### 1.3 Export Railway Database

```bash
# Get Railway database URL
railway variables get DATABASE_URL

# Export data
mysqldump -h railway-host -u root -p railway > railway_backup.sql

# Compress
gzip railway_backup.sql
```

### Phase 2: Deploy to Azure (Week 3)

#### 2.1 Import Database

```powershell
# Import to Azure MySQL
mysql -h $mysqlHost -u adminuser -p jamalert < railway_backup.sql

# Verify import
mysql -h $mysqlHost -u adminuser -p -e "USE jamalert; SHOW TABLES;"
```

#### 2.2 Deploy Function App

```powershell
# Build backend
cd backend
npm install
npm run build

# Deploy to Azure Functions
func azure functionapp publish jamalert-prod-func
```

#### 2.3 Run Migrations

```powershell
# Set DATABASE_URL
$env:DATABASE_URL = "mysql://adminuser:password@$mysqlHost/jamalert"

# Run Prisma migrations
npx prisma migrate deploy
```

### Phase 3: Testing (Week 4)

#### 3.1 Test Azure Deployment

```powershell
# Get Function App URL
$azureUrl = az functionapp show `
  --name jamalert-prod-func `
  --resource-group jamalert-prod-rg `
  --query "defaultHostName" -o tsv

# Test endpoints
curl "https://$azureUrl/api/health"
curl "https://$azureUrl/api/alerts"
```

#### 3.2 Performance Testing

```powershell
# Run load tests against Azure
k6 run --env BACKEND_URL=https://$azureUrl tests/load-test.js
```

### Phase 4: Cutover (Week 5)

#### 4.1 Update Vercel

```bash
# Update environment variables
NEXT_PUBLIC_BACKEND_PROVIDER=azure
NEXT_PUBLIC_AZURE_API_URL=https://azure-url/api
```

#### 4.2 Monitor

```powershell
# Watch Application Insights
az monitor app-insights metrics show `
  --app jamalert-prod-insights `
  --resource-group jamalert-prod-rg `
  --metric requests/count

# Check Function App logs
az functionapp log tail `
  --name jamalert-prod-func `
  --resource-group jamalert-prod-rg
```

### Phase 5: Post-Migration (Week 6+)

#### 5.1 Optimize Azure

- Configure auto-scaling
- Set up alerts and monitoring
- Optimize database performance
- Review and optimize costs

#### 5.2 Decommission Railway (Optional)

**Wait 2-4 weeks!**

```bash
# Final backup
railway run mysqldump > final_railway_backup.sql

# Delete Railway project
railway delete
```

---

## 🔄 Dual Deployment Strategy

### Continuous Sync Approach

#### Option 1: Shared Database

```
┌─────────────┐
│   Vercel    │
│  Frontend   │
└──────┬──────┘
       │
   ┌───┴────┐
   │        │
   ▼        ▼
┌──────┐ ┌──────┐
│Azure │ │Railway│
│ API  │ │ API  │
└───┬──┘ └───┬──┘
    │        │
    └────┬───┘
         ▼
    ┌─────────┐
    │ Railway │
    │  MySQL  │
    └─────────┘
```

**Setup:**
```bash
# Both backends use same DATABASE_URL
# Azure Function App settings
DATABASE_URL=mysql://railway-host/railway

# Railway variables
DATABASE_URL=mysql://railway-host/railway
```

**Pros:**
- No data sync needed
- Always consistent
- Easy to switch

**Cons:**
- Azure depends on Railway
- Single point of failure (database)

#### Option 2: Database Replication

```
┌─────────────┐
│   Vercel    │
│  Frontend   │
└──────┬──────┘
       │
   ┌───┴────┐
   │        │
   ▼        ▼
┌──────┐ ┌──────┐
│Azure │ │Railway│
│ API  │ │ API  │
└───┬──┘ └───┬──┘
    │        │
    ▼        ▼
┌──────┐ ┌──────┐
│Azure │ │Railway│
│MySQL │◄─┤MySQL │
└──────┘  └──────┘
   Replication
```

**Setup:**
```sql
-- Configure MySQL replication
-- Railway (Master) → Azure (Replica)

-- On Railway MySQL
CREATE USER 'repl'@'%' IDENTIFIED BY 'password';
GRANT REPLICATION SLAVE ON *.* TO 'repl'@'%';

-- On Azure MySQL
CHANGE MASTER TO
  MASTER_HOST='railway-host',
  MASTER_USER='repl',
  MASTER_PASSWORD='password';
START SLAVE;
```

**Pros:**
- Independent databases
- High availability
- Can failover completely

**Cons:**
- More complex setup
- Replication lag
- Higher costs

---

## 🆘 Rollback Procedures

### Quick Rollback (< 5 minutes)

```bash
# Revert Vercel environment variables
# Change NEXT_PUBLIC_BACKEND_PROVIDER back to previous value

# Vercel Dashboard → Settings → Environment Variables
# Or via CLI:
vercel env rm NEXT_PUBLIC_BACKEND_PROVIDER production
vercel env add NEXT_PUBLIC_BACKEND_PROVIDER production
# Enter: azure (or railway)

# Redeploy
vercel --prod
```

### Full Rollback (< 30 minutes)

```bash
# 1. Restore database from backup
mysql -h host -u user -p database < backup.sql

# 2. Redeploy previous version
git revert HEAD
git push

# 3. Update environment variables
# Revert all changes

# 4. Verify rollback
curl https://api-url/health
```

---

## 📊 Migration Checklist

### Pre-Migration
- [ ] Backup all databases
- [ ] Document all environment variables
- [ ] Test backup restoration
- [ ] Prepare rollback plan
- [ ] Schedule maintenance window
- [ ] Notify users (if applicable)

### During Migration
- [ ] Deploy to new platform
- [ ] Import database
- [ ] Run migrations
- [ ] Test all endpoints
- [ ] Update frontend configuration
- [ ] Monitor for errors

### Post-Migration
- [ ] Verify all features working
- [ ] Monitor performance metrics
- [ ] Check error rates
- [ ] Optimize as needed
- [ ] Keep old platform running for 2-4 weeks
- [ ] Final decommission

---

**Last Updated:** 2025-10-22  
**Version:** 1.0

