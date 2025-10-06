import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

declare global {
  // Prevent multiple instances during development hot reload
   
  var __prisma: PrismaClient | undefined;
}

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient({
    log: [
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });
  }
  prisma = global.__prisma;
}

// Log database events (for Prisma 5.22+)
try {
  // Note: These events may not be available in all Prisma versions
  if (typeof prisma.$on === 'function') {
    // Removed event listeners due to Prisma 5.22+ API changes
    // Events are now handled differently or not available
    logger.info('Prisma client initialized successfully');
  }
} catch (error) {
  logger.warn('Prisma event listeners not available in this version');
}

// Health check function
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database connection check failed', { error });
    return false;
  }
};

// Graceful shutdown
export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting from database', { error });
  }
};

// Transaction helper (updated for Prisma 5.22+)
export const withTransaction = async <T>(
  fn: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
): Promise<T> => {
  return await prisma.$transaction(fn);
};

export { prisma };