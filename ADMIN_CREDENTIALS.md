# JAMALERT Admin Credentials

## Admin Login Credentials

The JAMALERT application has two admin accounts configured for testing and development:

### Primary Admin Account
- **Email:** `admin@jamalert.com`
- **Password:** `admin123`
- **Role:** ADMIN
- **Status:** Active

### Demo Admin Account
- **Email:** `demo@jamalert.com`
- **Password:** `demo123`
- **Role:** ADMIN
- **Status:** Active

## How Admin Accounts Work

### Backend Implementation
The admin accounts are initialized automatically when the Express.js backend server starts. They are stored in-memory and recreated on each server restart.

**Location:** `backend/express-app/auth-service.js`

The admin users are created with bcrypt-hashed passwords and support JWT token-based authentication.

### Database Seeding (For Production)
For production deployments using the Azure Functions backend with a database, admin users can be seeded using:

**Location:** `backend/prisma/seed.ts`

Default credentials (can be overridden with environment variables):
- **Email:** `admin@jamalert.gov.jm` (or `ADMIN_EMAIL` env var)
- **Password:** `admin123!` (or `ADMIN_PASSWORD` env var)
- **Name:** System Administrator (or `ADMIN_NAME` env var)

## Admin Access URLs

### Local Development
- **Admin Login:** http://localhost:3000/admin/login
- **Admin Dashboard:** http://localhost:3000/admin/dashboard

### Production (Vercel)
- **Admin Login:** https://jamalert-frontend-demo.vercel.app/admin/login
- **Admin Dashboard:** https://jamalert-frontend-demo.vercel.app/admin/dashboard

## Security Notes

⚠️ **IMPORTANT:** These are development/demo credentials. For production deployment:

1. Change all default passwords immediately
2. Use strong, unique passwords (minimum 12 characters)
3. Store credentials securely using environment variables
4. Enable two-factor authentication if available
5. Regularly rotate admin passwords
6. Monitor admin access logs

## Admin Features

Admin users have access to:
- Dashboard with system statistics
- Alert management (create, send, monitor alerts)
- User management (view, activate/deactivate users)
- Incident report management (review, approve, reject reports)
- System health monitoring
- Audit logs
- Analytics and reporting

## Testing Admin Login

To test admin login:

1. Start the backend server: `cd backend/express-app && node server.js`
2. Start the frontend server: `npm run dev`
3. Navigate to http://localhost:3000/admin/login
4. Use either admin account credentials listed above
5. You should be redirected to the admin dashboard upon successful login

## Troubleshooting

If admin login fails:
- Verify the backend server is running on port 8000
- Check browser console for error messages
- Verify the JWT_SECRET environment variable is set
- Check that CORS is properly configured for localhost:3000
- Review backend logs for authentication errors

