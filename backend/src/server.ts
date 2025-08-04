import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { database } from './config/database';
import { N8nService } from './services/n8nService';
import { QdrantService } from './services/qdrantService';

// Import routes
import authRoutes from './routes/auth';
import workflowRoutes from './routes/workflows';
import clientRoutes from './routes/clients';
import analyticsRoutes from './routes/analytics';
import adminRoutes from './routes/admin';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    
    // Initialize services
    const n8nService = new N8nService();
    const qdrantService = new QdrantService();
    
    const [n8nHealth, qdrantHealth] = await Promise.all([
      n8nService.healthCheck().catch(() => false),
      qdrantService.healthCheck().catch(() => false)
    ]);
    
    const allHealthy = dbHealth && n8nHealth && qdrantHealth;
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: dbHealth ? 'healthy' : 'unhealthy',
        n8n: n8nHealth ? 'healthy' : 'unhealthy',
        qdrant: qdrantHealth ? 'healthy' : 'unhealthy'
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize database
    logger.info('Initializing database...');
    await database.migrate();
    
    // Test external services
    const n8nService = new N8nService();
    const qdrantService = new QdrantService();
    
    const [n8nHealth, qdrantHealth] = await Promise.all([
      n8nService.healthCheck().catch(() => false),
      qdrantService.healthCheck().catch(() => false)
    ]);
    
    if (!n8nHealth) {
      logger.warn('⚠️  n8n service not available - workflow operations will be limited');
    }
    
    if (!qdrantHealth) {
      logger.warn('⚠️  Qdrant service not available - vector operations will be limited');
    }
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🔧 API endpoints available at http://localhost:${PORT}/api`);
      logger.info(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 n8n: ${n8nHealth ? '✅ Connected' : '❌ Disconnected'}`);
      logger.info(`🔗 Qdrant: ${qdrantHealth ? '✅ Connected' : '❌ Disconnected'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await database.close();
  process.exit(0);
});

startServer();

export default app;