-- Run this script in SSMS to create the JamAlert database and configure the user
-- Connect to your SQL Server instance: DESKTOP-0PNOGI2\SQLEXPRESS

USE [master];
GO

-- Create the JamAlert database if it doesn't exist
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'JamAlert')
BEGIN
    CREATE DATABASE [JamAlert];
    PRINT 'Database JamAlert created successfully!';
END
ELSE
BEGIN
    PRINT 'Database JamAlert already exists.';
END
GO

-- Switch to JamAlert database
USE [JamAlert];
GO

-- Create user for the login (the login should already exist)
IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = N'jamalert_user')
BEGIN
    CREATE USER [jamalert_user] FOR LOGIN [jamalert_user];
    PRINT 'User jamalert_user created in JamAlert database!';
END
ELSE
BEGIN
    PRINT 'User jamalert_user already exists.';
END
GO

-- Grant permissions
ALTER ROLE [db_owner] ADD MEMBER [jamalert_user];
GO

PRINT '===========================================';
PRINT 'Setup Complete!';
PRINT 'Database: JamAlert';
PRINT 'Username: jamalert_user';
PRINT 'Password: JamAlert2024!Dev';
PRINT '===========================================';
GO
