import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'stockflow_super_secret_jwt_key_dev_2026_change_in_production';

/**
 * Authentication Middleware
 * 
 * Verifies JWT token stored in secure HTTP-only cookie (or Authorization header).
 * Populates req.user and req.organization from the database.
 * Never trusts client-supplied organization IDs.
 */
export async function authenticate(req, res, next) {
  try {
    // 1. Extract token from HTTP-only cookie or Authorization header fallback
    let token = req.cookies?.token;

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. Please log in.',
      });
    }

    // 2. Verify token signature and expiration
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Session expired. Please log in again.',
        });
      }
      return res.status(401).json({
        error: 'Invalid authentication token. Please log in again.',
      });
    }

    // 3. Load user and organization from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        organization: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        error: 'User account no longer exists.',
      });
    }

    if (!user.organization) {
      return res.status(401).json({
        error: 'Associated organization not found.',
      });
    }

    // 4. Attach trusted user and organization to request context
    req.user = {
      id: user.id,
      email: user.email,
      organizationId: user.organizationId,
    };

    req.organization = user.organization;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Internal server error during authentication.',
    });
  }
}
