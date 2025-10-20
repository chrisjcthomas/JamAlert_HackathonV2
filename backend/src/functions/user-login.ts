// @ts-nocheck
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { z } from 'zod';
import { UserService } from '../services/user.service';
import { AuthMiddleware } from '../lib/auth';
import { SecurityMiddleware, RATE_LIMIT_CONFIGS } from '../middleware/security.middleware';
import { SecurityService } from '../services/security.service';
import { ApiResponse } from '../types';

// Input validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

interface UserLoginResponse extends ApiResponse {
  data?: {
    token: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      parish: string;
    };
  };
}

/**
 * User Login Azure Function
 * POST /api/user/login
 */
export async function userLogin(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log('User login request received');

  const securityMiddleware = new SecurityMiddleware();
  const securityService = new SecurityService();

  try {
    // Apply security middleware with rate limiting for login
    const securityResult = await securityMiddleware.apply(request, context, {
      rateLimit: RATE_LIMIT_CONFIGS.LOGIN,
      requireHttps: true,
      validateInput: true,
      auditLog: true
    });

    if (securityResult) {
      return securityResult;
    }

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = request.headers.get('user-agent');

    // Parse and validate request body
    const body = await request.json();
    const validatedData = loginSchema.parse(body);

    // Initialize user service
    const userService = new UserService();

    // Authenticate user
    const user = await userService.authenticateUser(validatedData.email, validatedData.password);

    if (!user) {
      await securityService.logSecurityEvent(
        'USER_LOGIN_FAILED',
        'user_login',
        clientIp,
        false,
        undefined,
        userAgent,
        { email: validatedData.email },
        context
      );

      const response: UserLoginResponse = {
        success: false,
        error: 'Invalid email or password',
      };

      return SecurityMiddleware.addSecurityHeaders({
        status: 401,
        jsonBody: response,
      });
    }

    // Generate JWT token
    const token = AuthMiddleware.generateUserToken({
      id: user.id,
      email: user.email,
      parish: user.parish,
    });

    // Log successful login
    await securityService.logSecurityEvent(
      'USER_LOGIN_SUCCESS',
      'user_login',
      clientIp,
      true,
      user.id,
      userAgent,
      { email: user.email },
      context
    );

    context.log(`User login successful: ${user.email}`);

    const response: UserLoginResponse = {
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          parish: user.parish,
        },
      },
      message: 'Login successful',
    };

    return SecurityMiddleware.addSecurityHeaders({
      status: 200,
      jsonBody: response,
    });

  } catch (error) {
    context.error('User login error:', error);

    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const userAgent = request.headers.get('user-agent');

    await securityService.logSecurityEvent(
      'USER_LOGIN_ERROR',
      'user_login',
      clientIp,
      false,
      undefined,
      userAgent,
      { error: error.message },
      context
    );

    if (error instanceof z.ZodError) {
      const response: UserLoginResponse = {
        success: false,
        error: 'Validation failed',
        data: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      };

      return SecurityMiddleware.addSecurityHeaders({
        status: 400,
        jsonBody: response,
      });
    }

    const response: UserLoginResponse = {
      success: false,
      error: 'Login failed. Please try again.',
    };

    return SecurityMiddleware.addSecurityHeaders({
      status: 500,
      jsonBody: response,
    });
  }
}

// Register the function
app.http('user-login', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'user/login',
  handler: userLogin,
});
