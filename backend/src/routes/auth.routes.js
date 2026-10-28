import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'stockflow_super_secret_jwt_key_dev_2026_change_in_production';
const JWT_EXPIRES_IN = '7d';

/**
 * Cookie options for storing JWT securely in HTTP-only cookie.
 */
export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

/**
 * Rate limiter for sensitive auth endpoints to prevent brute-force attacks.
 * Disabled in test environment to avoid flaky automated test runs.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 min window
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
});

/**
 * Helper to generate signed JWT for authenticated user
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      organizationId: user.organizationId,
      email: user.email,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * POST /api/auth/signup
 * Register a new organization and owner account in an atomic transaction.
 */
router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const { organizationName, email, password, confirmPassword } = req.body;

    // 1. Basic validation
    if (!organizationName || typeof organizationName !== 'string' || organizationName.trim().length === 0) {
      return res.status(400).json({ error: 'Organization name is required.' });
    }

    if (organizationName.trim().length < 2) {
      return res.status(400).json({ error: 'Organization name must be at least 2 characters.' });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Password is required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    // 2. Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    // 3. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Create Organization and User atomically in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName.trim(),
          defaultLowStockThreshold: 5,
        },
      });

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          organizationId: organization.id,
        },
      });

      return { user, organization };
    });

    // 5. Issue JWT and set HTTP-only cookie
    const token = generateToken(result.user);
    res.cookie('token', token, COOKIE_OPTIONS);

    // 6. Return safe response (never expose passwordHash)
    return res.status(201).json({
      success: true,
      message: 'Account and organization created successfully.',
      user: {
        id: result.user.id,
        email: result.user.email,
        organizationId: result.user.organizationId,
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          defaultLowStockThreshold: result.organization.defaultLowStockThreshold,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and issue HTTP-only JWT cookie.
 */
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Find user by email including organization
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        organization: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // 3. Issue JWT and set cookie
    const token = generateToken(user);
    res.cookie('token', token, COOKIE_OPTIONS);

    // 4. Return safe user data
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          defaultLowStockThreshold: user.organization.defaultLowStockThreshold,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Clear authentication cookie.
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

/**
 * GET /api/auth/me
 * Retrieve currently authenticated user and organization.
 */
router.get('/me', authenticate, async (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user.id,
      email: req.user.email,
      organizationId: req.user.organizationId,
      organization: {
        id: req.organization.id,
        name: req.organization.name,
        defaultLowStockThreshold: req.organization.defaultLowStockThreshold,
      },
    },
  });
});

export default router;
