import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

import { logger } from './utils/logger';
import { errorHandler } from './middleware/error';
import { notFound } from './middleware/notFound';
import { prisma } from './utils/database';

// Import routes
import authRoutes from './routes/auth';
import companyRoutes from './routes/companies';
import teamMemberRoutes from './routes/team-members';
import projectRoutes from './routes/projects';
import awardRoutes from './routes/awards';
import templateRoutes from './routes/templates';
import sectionRoutes from './routes/sections';
import proposalRoutes from './routes/proposals';
import generationRoutes from './routes/generation';
import aiRoutes from './routes/ai';
import exportRoutes from './routes/exports';

const app = express();
const server = createServer(app);

// Basic middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // More lenient in development
  message: {
    error: 'Too many requests from this IP',
    statusCode: 429
  }
});
app.use(limiter);

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.get('/api/v1', (req, res) => {
  res.json({
    message: '智能標書產生器 API v1.0.0',
    status: 'ready',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      companies: '/api/v1/companies',
      teamMembers: '/api/v1/team-members',
      projects: '/api/v1/projects',
      awards: '/api/v1/awards',
      templates: '/api/v1/templates',
      sections: '/api/v1/sections',
      proposals: '/api/v1/proposals',
      generation: '/api/v1/generation',
      ai: '/api/v1/ai',
      exports: '/api/v1/exports',
    },
  });
});

// Mount API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/team-members', teamMemberRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/awards', awardRoutes);
app.use('/api/v1/templates', templateRoutes);
app.use('/api/v1/sections', sectionRoutes);
app.use('/api/v1/proposals', proposalRoutes);
app.use('/api/v1/generation', generationRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/exports', exportRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    logger.info(`🚀 標書產生器後端伺服器啟動成功`, {
      port: PORT,
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    });
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Process terminated');
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  server.close(() => {
    logger.info('Process terminated');
  });
});

export default app;