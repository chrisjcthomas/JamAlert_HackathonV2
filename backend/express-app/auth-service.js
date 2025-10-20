const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Import Prisma client from parent directory
const { PrismaClient } = require('../node_modules/@prisma/client');

const prisma = new PrismaClient();

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '7d'; // 7 days

/**
 * Admin login with email and password
 */
async function adminLogin(email, password) {
  try {
    // Find admin user
    const admin = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!admin || !admin.isActive) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Update last login
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: 'admin',
        adminRole: admin.role,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return {
      success: true,
      data: {
        token,
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: 'admin',
          adminRole: admin.role,
          createdAt: admin.createdAt,
        },
      },
    };
  } catch (error) {
    console.error('Admin login error:', error);
    return { success: false, error: 'Login failed' };
  }
}

/**
 * User registration
 */
async function registerUser(userData) {
  try {
    const { email, firstName, lastName, parish, phone, password, smsAlerts, emailAlerts, emergencyOnly } = userData;

    // Validate password
    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long' };
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Convert parish name to enum value
    const parishEnum = parish.toUpperCase().replace(/ /g, '_').replace(/\./g, '');

    // Create new user
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        passwordHash,
        phone: phone || null,
        parish: parishEnum,
        address: userData.address || null,
        smsAlerts: smsAlerts || false,
        emailAlerts: emailAlerts !== undefined ? emailAlerts : true,
        emergencyOnly: emergencyOnly || false,
      },
    });

    // Generate JWT token for immediate login
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: 'user',
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: 'user',
          parish: user.parish,
          phone: user.phone,
          createdAt: user.createdAt,
        },
      },
      message: 'Registration successful!',
    };
  } catch (error) {
    console.error('User registration error:', error);
    return { success: false, error: 'Registration failed' };
  }
}

/**
 * Get user by ID
 */
async function getUserById(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, isActive: true },
    });

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      role: 'user',
      parish: user.parish,
      phone: user.phone,
      createdAt: user.createdAt,
    };
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Get admin by ID
 */
async function getAdminById(adminId) {
  try {
    const admin = await prisma.adminUser.findUnique({
      where: { id: adminId, isActive: true },
    });

    if (!admin) {
      return null;
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: 'admin',
      adminRole: admin.role,
      createdAt: admin.createdAt,
    };
  } catch (error) {
    console.error('Get admin error:', error);
    return null;
  }
}

/**
 * Verify JWT token
 */
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { success: true, data: decoded };
  } catch (error) {
    return { success: false, error: 'Invalid token' };
  }
}

/**
 * User login with email and password
 */
async function userLogin(email, password) {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.isActive) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: 'user',
        parish: user.parish,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    return {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: 'user',
          parish: user.parish,
          phone: user.phone,
          createdAt: user.createdAt,
        },
      },
    };
  } catch (error) {
    console.error('User login error:', error);
    return { success: false, error: 'Login failed' };
  }
}

module.exports = {
  adminLogin,
  userLogin,
  registerUser,
  getUserById,
  getAdminById,
  verifyToken,
  JWT_SECRET,
};
