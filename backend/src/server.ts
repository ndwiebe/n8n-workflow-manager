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
import { businessMetricsService } from './services/businessMetricsService';

// Import routes
import authRoutes from './routes/auth';
import workflowRoutes from './routes/workflows';
import clientRoutes from './routes/clients';
import analyticsRoutes from './routes/analytics';
import adminRoutes from './routes/admin';
import businessRoutes from './routes/business';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting with business-friendly limits
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Higher limit for development
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Business API specific rate limiting (more generous for dashboard)
const businessLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // Allow more requests for business metrics
  message: 'Business API rate limit exceeded. Please try again later.'
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Enhanced health check endpoint with business metrics status
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
    
    // Test business metrics service
    let businessMetricsHealth = false;
    try {
      // Quick test - this should not throw if service is working
      await businessMetricsService.getBusinessDashboard();
      businessMetricsHealth = true;
    } catch (error) {
      logger.warn('Business metrics service health check failed:', error);
    }
    
    const allHealthy = dbHealth && n8nHealth && qdrantHealth && businessMetricsHealth;
    
    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'OK' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbHealth ? 'healthy' : 'unhealthy',
        n8n: n8nHealth ? 'healthy' : 'unhealthy',
        qdrant: qdrantHealth ? 'healthy' : 'unhealthy',
        businessMetrics: businessMetricsHealth ? 'healthy' : 'unhealthy'
      },
      businessFeatures: {
        roiCalculation: true,
        dashboardMetrics: businessMetricsHealth,
        workflowMonitoring: n8nHealth,
        smbTemplates: true
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

// SMB-specific configuration endpoint
app.get('/api/config/smb', (req, res) => {
  res.json({
    success: true,
    data: {
      features: {
        roiCalculation: true,
        businessDashboard: true,
        workflowMonitoring: true,
        smbTemplates: true,
        costTracking: true,
        performanceAlerts: true
      },
      limits: {
        maxWorkflows: process.env.SMB_MAX_WORKFLOWS || 50,
        maxExecutionsPerMonth: process.env.SMB_MAX_EXECUTIONS || 10000,
        maxUsers: process.env.SMB_MAX_USERS || 25
      },
      support: {
        businessHours: '9 AM - 5 PM EST',
        responseTime: '24 hours',
        channels: ['email', 'chat']
      },
      integrations: {
        n8n: {
          available: true,
          baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
          version: 'latest'
        },
        businessMetrics: {
          available: true,
          realTimeUpdates: true,
          roiTracking: true
        }
      }
    }
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/business', businessLimiter, businessRoutes); // Apply business-specific rate limiting

// Business-specific middleware for metrics collection
app.use('/api/business', (req, res, next) => {
  // Log business API usage for analytics
  logger.info('Business API accessed:', {
    endpoint: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  next();
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    availableEndpoints: {
      auth: '/api/auth',
      workflows: '/api/workflows',
      business: '/api/business',
      clients: '/api/clients',
      analytics: '/api/analytics',
      admin: '/api/admin',
      health: '/health',
      smbConfig: '/api/config/smb'
    }
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
    
    // Test business metrics service
    let businessMetricsHealth = false;
    try {
      await businessMetricsService.getBusinessDashboard();
      businessMetricsHealth = true;
      logger.info('✅ Business metrics service initialized successfully');
    } catch (error) {
      logger.warn('⚠️  Business metrics service initialization failed:', error);
    }
    
    if (!n8nHealth) {
      logger.warn('⚠️  n8n service not available - workflow operations will be limited');
      logger.info('💡 Make sure n8n is running and N8N_API_KEY is configured');
    }
    
    if (!qdrantHealth) {
      logger.warn('⚠️  Qdrant service not available - vector operations will be limited');
    }
    
    // Log SMB configuration
    logger.info('🏢 SMB Configuration:', {
      maxWorkflows: process.env.SMB_MAX_WORKFLOWS || 50,
      maxExecutions: process.env.SMB_MAX_EXECUTIONS || 10000,
      maxUsers: process.env.SMB_MAX_USERS || 25,
      businessMetrics: businessMetricsHealth
    });
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 n8n Workflow Manager Backend running on port ${PORT}`);
      logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🔧 API endpoints available at http://localhost:${PORT}/api`);
      logger.info(`💼 Business API available at http://localhost:${PORT}/api/business`);
      logger.info(`🏢 SMB Config available at http://localhost:${PORT}/api/config/smb`);
      logger.info(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Service status
      logger.info('📡 Service Status:');
      logger.info(`   🗄️  Database: ${dbHealth ? '✅ Connected' : '❌ Disconnected'}`);
      logger.info(`   🔄 n8n: ${n8nHealth ? '✅ Connected' : '❌ Disconnected'}`);
      logger.info(`   🔍 Qdrant: ${qdrantHealth ? '✅ Connected' : '❌ Disconnected'}`);
      logger.info(`   📈 Business Metrics: ${businessMetricsHealth ? '✅ Ready' : '❌ Limited'}`);
      
      // Business features status
      logger.info('💼 Business Features:');
      logger.info(`   📊 ROI Calculation: ✅ Available`);
      logger.info(`   📋 Dashboard Metrics: ${businessMetricsHealth ? '✅ Available' : '⚠️  Limited'}`);
      logger.info(`   🔔 Workflow Monitoring: ${n8nHealth ? '✅ Available' : '⚠️  Limited'}`);
      logger.info(`   📘 SMB Templates: ✅ Available`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info('🛠️  Development mode: Higher rate limits and verbose logging enabled');
      }
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

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, but log the error
});

startServer();

export default app;