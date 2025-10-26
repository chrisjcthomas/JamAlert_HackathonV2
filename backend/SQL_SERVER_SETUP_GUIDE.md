# SQL Server Setup Guide for JamAlert Backend

## Problem
Prisma has difficulty connecting to SQL Server Express named instances with Windows Authentication due to connection string parsing issues with backslashes.

## Solution Options

### Option 1: Use SQL Server Authentication (RECOMMENDED - Easiest)

1. **Open SQL Server Management Studio (SSMS)**
   - Connect to: `DESKTOP-0PNOGI2\SQLEXPRESS`
   - Use Windows Authentication

2. **Run the setup script**
   - Open the file: `backend/setup-sql-login.sql`
   - Execute it in SSMS
   - This creates a login: `jamalert_user` with password: `JamAlert2024!Dev`

3. **Enable SQL Server Authentication**
   - Right-click on the server in SSMS → Properties
   - Go to Security page
   - Select "SQL Server and Windows Authentication mode"
   - Click OK
   - **Restart SQL Server service**: 
     ```powershell
     Restart-Service -Name "MSSQL`$SQLEXPRESS" -Force
     ```

4. **Update your .env file**
   ```
   DATABASE_URL="sqlserver://localhost:1433;database=JamAlert;user=jamalert_user;password=JamAlert2024!Dev;encrypt=true;trustServerCertificate=true"
   ```

5. **Enable TCP/IP (if not already enabled)**
   - Open SQL Server Configuration Manager
   - Expand "SQL Server Network Configuration"
   - Click "Protocols for SQLEXPRESS"
   - Right-click "TCP/IP" → Enable
   - Right-click "TCP/IP" → Properties
   - Go to "IP Addresses" tab
   - Scroll to "IPAll" section
   - Set "TCP Port" to: `1433`
   - Clear "TCP Dynamic Ports" (make it empty)
   - Click OK
   - **Restart SQL Server service**

---

### Option 2: Use Windows Authentication with Named Pipes (Alternative)

If you prefer to keep Windows Authentication, try this connection string:

```
DATABASE_URL="sqlserver://localhost;database=JamAlert;integratedSecurity=true;trustServerCertificate=true;encrypt=true"
```

Then configure SQL Server to accept named pipe connections:
- Open SQL Server Configuration Manager
- Enable "Named Pipes" protocol
- Restart SQL Server

---

### Option 3: Switch to PostgreSQL (If issues persist)

I noticed PostgreSQL is also installed on your system. If SQL Server continues to cause issues:

1. Update `backend/prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Update `.env`:
   ```
   DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/jamalert"
   ```

3. Recreate database:
   ```powershell
   cd backend
   pnpm run db:push
   ```

---

## After Configuration

Once you've completed one of the options above, run:

```powershell
cd backend
pnpm run db:push      # Create database schema
pnpm run db:generate  # Generate Prisma client
pnpm start            # Start backend server
```

## Verify Connection

You can test the connection in SSMS or using:
```powershell
cd backend
npx prisma studio
```

This will open a web interface to browse your database.
