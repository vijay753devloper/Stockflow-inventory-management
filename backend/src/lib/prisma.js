import { PrismaClient } from '@prisma/client';

/**
 * PrismaClient singleton instance to prevent multiple client instances
 * in development environments with hot-reloading.
 */
const globalForPrisma = globalThis;

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'test' ? [] : ['error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
