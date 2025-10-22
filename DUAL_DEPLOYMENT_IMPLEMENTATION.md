# JAMALERT Dual-Deployment Implementation Guide

## 🎯 Quick Start

This guide provides step-by-step instructions to implement the dual-deployment strategy for JAMALERT.

**Time Required:** 2-4 hours  
**Difficulty:** Medium  
**Prerequisites:** Basic knowledge of Azure, Railway, and Vercel

---

## 📋 What's Been Implemented

### ✅ Completed Components

1. **Backend Configuration System** (`lib/backend-config.ts`)
   - Manages switching between Azure and Railway
   - Automatic failover on errors
   - Health checking for providers
   - Provider status monitoring

2. **Enhanced API Client** (`lib/api-client.ts`)
   - Supports multiple backend providers
   - Automatic retry with fallback URLs
   - Intelligent error handling
   - Seamless provider switching

3. **Railway Configuration** (`railway.json`)
   - Ready-to-deploy Railway configuration
   - Optimized build and deploy settings

4. **Environment Template** (`.env.example`)
   - Complete environment variable documentation
   - Supports both Azure and Railway
   - Feature flags and configuration options

5. **Deployment Scripts**
   - `scripts/deploy-azure.ps1` - Azure deployment automation
   - `scripts/deploy-railway.ps1` - Railway deployment automation

6. **Documentation**
   - `DUAL_DEPLOYMENT_STRATEGY.md` - Overall strategy
   - `RAILWAY_DEPLOYMENT_GUIDE.md` - Railway setup guide
   - `DEPLOYMENT_DECISION_MATRIX.md` - Decision framework
   - `MIGRATION_GUIDE.md` - Migration procedures

7. **Updated Vercel Configuration** (`vercel.json`)
   - Supports both Azure and Railway backends
   - Environment-based switching
   - Failover configuration

---

## 🚀 Implementation Steps

### Step 1: Update Local Environment (5 minutes)

1. **Copy environment template**
   ```powershell
   Copy-Item .env.example backend/express-app/.env
   ```

2. **Edit `.env` file**
   ```bash
   # Set your actual values
   DATABASE_URL=mysql://...
   JWT_SECRET=your-secret-key
   OPENWEATHER_API_KEY=your-api-key
   SMTP_PASSWORD=your-smtp-password
   TWILIO_AUTH_TOKEN=your-twilio-token
   ```

3. **Test locally**
   ```powershell
   cd backend/express-app
   npm install
   npm start
   ```

### Step 2: Deploy to Railway (30-60 minutes)

Follow the detailed guide in `RAILWAY_DEPLOYMENT_GUIDE.md`:

1. **Create Railway account**
   - Visit https://railway.app
   - Sign up with GitHub

2. **Deploy using CLI**
   ```powershell
   # Install Railway CLI
   npm install -g @railway/cli

   # Run deployment script
   .\scripts\deploy-railway.ps1 -Environment production
   ```

3. **Or deploy manually**
   - Railway Dashboard → New Project
   - Deploy from GitHub repo
   - Add MySQL database
   - Configure environment variables
   - Deploy

4. **Get Railway URL**
   ```bash
   railway domain
   # Copy the URL: https://your-app.up.railway.app
   ```

### Step 3: Deploy to Azure (4-8 hours)

Follow the Azure deployment guide:

1. **Install Azure CLI** (if not installed)
   ```powershell
   # Download from: https://aka.ms/installazurecliwindows
   # Or use winget:
   winget install Microsoft.AzureCLI
   ```

2. **Login to Azure**
   ```powershell
   az login
   ```

3. **Run deployment script**
   ```powershell
   .\scripts\deploy-azure.ps1 -Environment prod
   ```

4. **Get Azure URL**
   ```powershell
   az functionapp show `
     --name jamalert-prod-func `
     --resource-group jamalert-prod-rg `
     --query "defaultHostName" -o tsv
   ```

### Step 4: Update Vercel Configuration (10 minutes)

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/dashboard
   - Select your JAMALERT project

2. **Update Environment Variables**
   
   Navigate to: Settings → Environment Variables

   **Add/Update these variables:**
   ```bash
   # Backend Provider Selection
   NEXT_PUBLIC_BACKEND_PROVIDER=azure
   # Options: "azure" | "railway" | "auto"

   # Enable Failover
   NEXT_PUBLIC_ENABLE_BACKEND_FAILOVER=true

   # Azure URLs (update with your actual URLs)
   NEXT_PUBLIC_AZURE_API_URL=https://jamalert-prod-func.azurewebsites.net/api
   NEXT_PUBLIC_AZURE_FALLBACK_URL=https://jamalert-express-api.azurewebsites.net/api

   # Railway URLs (update with your actual URLs)
   NEXT_PUBLIC_RAILWAY_API_URL=https://your-app.up.railway.app/api
   NEXT_PUBLIC_RAILWAY_FALLBACK_URL=https://your-app-staging.up.railway.app/api

   # Application Settings
   NEXT_PUBLIC_DEMO_MODE=false
   NEXT_PUBLIC_ENVIRONMENT=production
   ```

3. **Redeploy Frontend**
   ```bash
   # Trigger new deployment
   vercel --prod
   
   # Or push to GitHub (auto-deploys)
   git add .
   git commit -m "Update backend configuration for dual deployment"
   git push origin main
   ```

### Step 5: Test Backend Switching (15 minutes)

1. **Test Azure Backend**
   ```powershell
   # Update Vercel env
   NEXT_PUBLIC_BACKEND_PROVIDER=azure
   
   # Test in browser
   # Visit: https://jamalert.vercel.app
   # Open DevTools → Console
   # Should see: "Using backend: Azure"
   ```

2. **Test Railway Backend**
   ```powershell
   # Update Vercel env
   NEXT_PUBLIC_BACKEND_PROVIDER=railway
   
   # Test in browser
   # Should see: "Using backend: Railway"
   ```

3. **Test Auto Mode**
   ```powershell
   # Update Vercel env
   NEXT_PUBLIC_BACKEND_PROVIDER=auto
   
   # Should automatically select best available backend
   ```

4. **Test Failover**
   ```powershell
   # Temporarily stop one backend
   # Frontend should automatically switch to other backend
   # Check console for failover messages
   ```

---

## 🔧 Configuration Options

### Backend Provider Options

#### Option 1: Azure Primary (Recommended for Production)
```bash
NEXT_PUBLIC_BACKEND_PROVIDER=azure
NEXT_PUBLIC_ENABLE_BACKEND_FAILOVER=true
```
- Uses Azure as primary
- Falls back to Railway if Azure fails
- Best for: Production with enterprise requirements

#### Option 2: Railway Primary (Recommended for Development)
```bash
NEXT_PUBLIC_BACKEND_PROVIDER=railway
NEXT_PUBLIC_ENABLE_BACKEND_FAILOVER=true
```
- Uses Railway as primary
- Falls back to Azure if Railway fails
- Best for: Cost optimization, rapid development

#### Option 3: Auto-Select (Recommended for Testing)
```bash
NEXT_PUBLIC_BACKEND_PROVIDER=auto
NEXT_PUBLIC_ENABLE_BACKEND_FAILOVER=true
```
- Automatically selects best available backend
- Tries Azure first, then Railway
- Best for: Testing, comparison, high availability

#### Option 4: No Failover (Single Backend)
```bash
NEXT_PUBLIC_BACKEND_PROVIDER=azure
NEXT_PUBLIC_ENABLE_BACKEND_FAILOVER=false
```
- Uses only specified backend
- No automatic switching
- Best for: Committed to single platform

---

## 📊 Monitoring and Management

### Check Backend Status

Add this component to your admin dashboard:

```typescript
// components/admin/backend-status.tsx
import { getProviderStatus, getCurrentProvider } from '@/lib/backend-config';

export function BackendStatus() {
  const status = getProviderStatus();
  const current = getCurrentProvider();

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold mb-2">Backend Status</h3>
      <p>Current Provider: {current}</p>
      
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <span className={status.azure.healthy ? 'text-green-500' : 'text-red-500'}>
            ● Azure
          </span>
          {status.azure.lastCheck && (
            <span className="text-sm text-gray-500">
              Last check: {new Date(status.azure.lastCheck).toLocaleTimeString()}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className={status.railway.healthy ? 'text-green-500' : 'text-red-500'}>
            ● Railway
          </span>
          {status.railway.lastCheck && (
            <span className="text-sm text-gray-500">
              Last check: {new Date(status.railway.lastCheck).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Manual Backend Switching

Add this to your admin panel:

```typescript
// components/admin/backend-switcher.tsx
import { switchBackendProvider } from '@/lib/backend-config';

export function BackendSwitcher() {
  const handleSwitch = (provider: 'azure' | 'railway' | 'auto') => {
    switchBackendProvider(provider);
    window.location.reload(); // Reload to apply changes
  };

  return (
    <div className="flex gap-2">
      <button onClick={() => handleSwitch('azure')}>Use Azure</button>
      <button onClick={() => handleSwitch('railway')}>Use Railway</button>
      <button onClick={() => handleSwitch('auto')}>Auto-Select</button>
    </div>
  );
}
```

---

## 🎯 Deployment Scenarios

### Scenario 1: Start with Railway, Keep Azure Ready

**Setup:**
1. Deploy to Railway (30 min)
2. Configure Azure but don't deploy yet (1 hour)
3. Set Vercel to use Railway

**Configuration:**
```bash
NEXT_PUBLIC_BACKEND_PROVIDER=railway
NEXT_PUBLIC_ENABLE_BACKEND_FAILOVER=false
```

**Cost:** $5-20/month (Railway only)

**When to switch to Azure:**
- User base exceeds 50K
- Need compliance certifications
- Railway performance issues

---

### Scenario 2: Start with Azure, Keep Railway as Backup

**Setup:**
1. Deploy to Azure (4-8 hours)
2. Deploy to Railway (30 min)
3. Set Vercel to use Azure with Railway failover

**Configuration:**
```bash
NEXT_PUBLIC_BACKEND_PROVIDER=azure
NEXT_PUBLIC_ENABLE_BACKEND_FAILOVER=true
```

**Cost:** $40-105/month (Azure) + $5/month (Railway standby)

**Benefits:**
- Enterprise-grade primary
- Cost-effective backup
- Easy failover

---

### Scenario 3: Run Both in Parallel

**Setup:**
1. Deploy to both Azure and Railway
2. Use auto-select mode
3. Monitor both platforms

**Configuration:**
```bash
NEXT_PUBLIC_BACKEND_PROVIDER=auto
NEXT_PUBLIC_ENABLE_BACKEND_FAILOVER=true
```

**Cost:** $45-155/month (both platforms)

**Use for:**
- Performance comparison
- Cost analysis
- Migration testing
- High availability

---

## 🆘 Troubleshooting

### Issue: Backend switching not working

**Check:**
1. Environment variables set correctly in Vercel
2. Both backend URLs are accessible
3. Browser cache cleared
4. Check browser console for errors

**Solution:**
```bash
# Verify environment variables
vercel env ls

# Test backend URLs directly
curl https://azure-url/api/health
curl https://railway-url/api/health
```

---

### Issue: Failover not triggering

**Check:**
1. `NEXT_PUBLIC_ENABLE_BACKEND_FAILOVER=true`
2. Fallback URLs configured
3. Primary backend actually failing

**Solution:**
```typescript
// Check backend config in browser console
import { backendConfig } from '@/lib/backend-config';
console.log(backendConfig.getConfig());
```

---

### Issue: High costs on both platforms

**Solution:**
1. Choose primary platform
2. Scale down or pause secondary platform
3. Use Railway Hobby plan for backup ($5/month)
4. Review resource utilization

---

## 📚 Next Steps

1. ✅ **Choose your deployment scenario** (see above)
2. ✅ **Deploy to chosen platform(s)**
3. ✅ **Update Vercel configuration**
4. ✅ **Test thoroughly**
5. ✅ **Monitor performance and costs**
6. ✅ **Review monthly** using Decision Matrix
7. ✅ **Optimize based on actual usage**

---

## 📞 Support

- **Azure Issues**: Check `scripts/deploy-azure.ps1` logs
- **Railway Issues**: Check `scripts/deploy-railway.ps1` logs
- **Frontend Issues**: Check Vercel deployment logs
- **Backend Switching**: Check browser console

---

**Last Updated:** 2025-10-22  
**Version:** 1.0  
**Status:** Ready for Implementation

