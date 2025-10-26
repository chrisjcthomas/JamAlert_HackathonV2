-- Run this script in SSMS to create a SQL Server login for the application
-- Connect to your SQL Server instance and run this against the JamAlert database

USE [master];
GO

-- Create login
CREATE LOGIN [jamalert_user] WITH PASSWORD = 'JamAlert2024!Dev', CHECK_POLICY = OFF;
GO

-- Switch to JamAlert database
USE [JamAlert];
GO

-- Create user for the login
CREATE USER [jamalert_user] FOR LOGIN [jamalert_user];
GO

-- Grant permissions
ALTER ROLE [db_owner] ADD MEMBER [jamalert_user];
GO

PRINT 'SQL Login created successfully!';
PRINT 'Username: jamalert_user';
PRINT 'Password: JamAlert2024!Dev';
PRINT 'Update your .env file with:';
PRINT 'DATABASE_URL="sqlserver://localhost:1433;database=JamAlert;user=jamalert_user;password=JamAlert2024!Dev;trustServerCertificate=true;encrypt=true"';
GO
