const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// In-memory database for development
const users = new Map();
const adminUsers = new Map();

// JWT secret - in production, use environment variable
let JWT_SECRET = process.env.JWT_SECRET;
const isProduction = process.env.NODE_ENV === 'production';

if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
  if (isProduction) {
    console.error('❌ FATAL ERROR: JWT_SECRET is not set or is insecure in production!');
    process.exit(1);
  } else {
    JWT_SECRET = 'your-secret-key-change-in-production';
    console.warn('⚠️ SECURITY WARNING: Using default JWT secret. Set JWT_SECRET in environment variables.');
  }
}
const JWT_EXPIRY = '7d'; // 7 days

// Initialize default admin users
async function initializeAdminUsers() {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    // --- Admin User ---
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@jamalert.com';
    let adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      if (isProduction) {
        console.warn('⚠️ SECURITY WARNING: ADMIN_PASSWORD not set in production. Default admin user will NOT be created.');
      } else {
        adminPassword = 'admin123';
        console.warn('⚠️ SECURITY WARNING: Using default admin password. Set ADMIN_PASSWORD in environment variables.');
      }
    }

    if (adminPassword) {
      // Create default admin user
      const adminId = uuidv4();
      const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

      const defaultAdmin = {
        id: adminId,
        email: adminEmail,
        passwordHash: adminPasswordHash,
        name: 'System Administrator',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        lastLogin: null,
      };

      adminUsers.set(adminId, defaultAdmin);
      console.log('✅ Default admin user created:', defaultAdmin.email);
    }

    // --- Demo/Dev Admin User ---
    const demoEmail = process.env.DEMO_EMAIL || 'demo@jamalert.com';
    let demoPassword = process.env.DEMO_PASSWORD;

    // Only fallback to default demo password in non-production
    if (!demoPassword && !isProduction) {
      demoPassword = 'demo123';
    }

    if (demoPassword) {
      // Create development admin user
      const devAdminId = uuidv4();
      const devPasswordHash = await bcrypt.hash(demoPassword, 10);

      const devAdmin = {
        id: devAdminId,
        email: demoEmail,
        passwordHash: devPasswordHash,
        name: 'Demo Administrator',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        lastLogin: null,
      };

      adminUsers.set(devAdminId, devAdmin);
      console.log('✅ Demo admin user created:', devAdmin.email);
    }

  } catch (error) {
    console.error('❌ Error initializing admin users:', error);
  }
}

// Initialize admin users immediately
initializeAdminUsers();

/**
 * Admin login with email and password
 */
async function adminLogin(email, password) {
  try {
    // Find admin user in memory
    const admin = Array.from(adminUsers.values()).find(u => u.email === email);

    if (!admin || !admin.isActive) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
    if (!isValidPassword) {
      return { success: false, error: 'Invalid credentials' };
    }

    // Update last login
    admin.lastLogin = new Date();

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
    const { email, firstName, lastName, parish, phone, password, smsAlerts, emailAlerts, emergencyOnly, address } = userData;

    // Validate password
    if (!password || password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long' };
    }

    // Check if user already exists
    const existingUser = Array.from(users.values()).find(u => u.email === email);
    if (existingUser) {
      return { success: false, error: 'Email already registered' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Convert parish name to enum value
    const parishEnum = parish.toUpperCase().replace(/ /g, '_').replace(/\./g, '');

    // Create new user
    const userId = require('uuid').v4();
    const user = {
      id: userId,
      firstName,
      lastName,
      email,
      passwordHash,
      phone: phone || null,
      parish: parishEnum,
      address: address || null,
      smsAlerts: smsAlerts || false,
      emailAlerts: emailAlerts !== undefined ? emailAlerts : true,
      emergencyOnly: emergencyOnly || false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    users.set(userId, user);

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
    const user = users.get(userId);

    if (!user || !user.isActive) {
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
    const admin = adminUsers.get(adminId);

    if (!admin || !admin.isActive) {
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
    // Find user in memory
    const user = Array.from(users.values()).find(u => u.email === email);

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
