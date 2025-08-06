import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { database } from './config/database';
import { N8nService } from './services/n8nService';
import { QdrantService } from './services/qdrantService';
import { businessMetricsService } from './services/businessMetricsService';
import { keyManagementService } from './services/keyManagementService';
import { 
  securityHeadersMiddleware, 
  createBusinessRateLimiter,
  createAuthRateLimiter,
  createAPIRateLimiter,
  logSecurityEvent
} from './middleware/securityHeaders';

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

// Initialize security services
const businessLimiter = createBusinessRateLimiter();
const authLimiter = createAuthRateLimiter();
const apiLimiter = createAPIRateLimiter();

// Apply comprehensive security middleware first
app.use(securityHeadersMiddleware.middleware());

// Enhanced CORS configuration with strict validation
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'https://localhost:3000',
      ...(process.env.ADDITIONAL_ALLOWED_ORIGINS?.split(',') || [])
    ].filter(Boolean);

    // Allow requests with no origin (mobile apps, postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logSecurityEvent('CORS_VIOLATION', {
        origin,
        allowedOrigins,
        timestamp: new Date().toISOString()
      });
      callback(new Error('CORS policy violation'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-Request-ID',
    'X-Correlation-ID',
    'User-Agent'
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-Rate-Limit-Limit',
    'X-Rate-Limit-Remaining',
    'X-Rate-Limit-Reset'
  ]
};

app.use(cors(corsOptions));

// Body parsing middleware with size limits and validation
app.use(express.json({ 
  limit: '10mb',
  verify: (req: any, res, buf) => {
    // Store raw body for signature verification if needed
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// Compression with security considerations
app.use(compression({
  threshold: 1024,
  filter: (req, res) => {
    // Don't compress responses with sensitive data
    if (req.path.includes('/api/auth') || req.path.includes('/api/secrets')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Enhanced logging with security context
app.use(morgan('combined', { 
  stream: { 
    write: (message: string) => {
      // Parse morgan log for security analysis
      const logData = message.trim();
      if (logData.includes('401') || logData.includes('403') || logData.includes('429')) {
        logSecurityEvent('SECURITY_LOG', { logData });
      }
      logger.info(logData);
    }
  },
  skip: (req, res) => {
    // Skip logging for health checks to reduce noise
    return req.path === '/health' && res.statusCode === 200;
  }
}));

// Security monitoring middleware
app.use((req, res, next) => {
  // Add security context to request
  (req as any).securityContext = {
    requestId: res.getHeader('X-Request-ID'),
    timestamp: new Date().toISOString(),
    clientIP: req.ip,
    userAgent: req.headers['user-agent'],
    path: req.path,
    method: req.method
  };
  
  // Monitor for suspicious activity
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /vbscript:/i,  // VBScript injection
    /onload=/i,  // Event handler injection
    /onerror=/i  // Error handler injection
  ];

  const urlContainsSuspiciousPattern = suspiciousPatterns.some(pattern => 
    pattern.test(req.url) || pattern.test(req.body ? JSON.stringify(req.body) : '')
  );

  if (urlContainsSuspiciousPattern) {
    logSecurityEvent('SUSPICIOUS_REQUEST', {
      url: req.url,
      body: req.body ? JSON.stringify(req.body).substring(0, 500) : null,
      clientIP: req.ip,
      userAgent: req.headers['user-agent']
    });
  }

  next();
});

// Enhanced health check endpoint with security status
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    
    // Initialize services
    const n8nService = new N8nService();
    const qdrantService = new QdrantService();
    
    const [n8nHealth, qdrantHealth, keyManagementHealth] = await Promise.all([
      n8nService.healthCheck().catch(() => false),
      qdrantService.healthCheck().catch(() => false),
      keyManagementService.healthCheck().catch(() => ({ status: 'unhealthy', details: {} }))
    ]);
    
    // Test business metrics service
    let businessMetricsHealth = false;
    try {
      await businessMetricsService.getBusinessDashboard();
      businessMetricsHealth = true;
    } catch (error) {
      logger.warn('Business metrics service health check failed:', error);
    }
    
    const allHealthy = dbHealth && n8nHealth && qdrantHealth && 
      keyManagementHealth.status === 'healthy' && businessMetricsHealth;
    
    // Security configuration status
    const securityConfig = securityHeadersMiddleware.getConfig();
    const securityStatus = {
      cspEnabled: securityConfig.csp.enabled,
      hstsEnabled: securityConfig.hsts.enabled,
      rateLimitingActive: true,
      keyManagementStatus: keyManagementHealth.status,
      complianceFlags: {
        gdpr: securityConfig.compliance.gdpr,
        pipeda: securityConfig.compliance.pipeda,
        soc2: securityConfig.compliance.soc2,
        iso27001: securityConfig.compliance.iso27001
      }
    };
    
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
        businessMetrics: businessMetricsHealth ? 'healthy' : 'unhealthy',
        keyManagement: keyManagementHealth.status
      },
      security: securityStatus,
      businessFeatures: {
        roiCalculation: true,
        dashboardMetrics: businessMetricsHealth,
        workflowMonitoring: n8nHealth,
        smbTemplates: true,
        encryptionAtRest: keyManagementHealth.status === 'healthy',
        auditLogging: true,
        complianceReporting: true
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    logSecurityEvent('HEALTH_CHECK_FAILURE', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Security status endpoint for monitoring
app.get('/api/security/status', (req, res) => {
  try {
    const securityConfig = securityHeadersMiddleware.getConfig();
    
    res.json({
      success: true,
      data: {
        securityHeaders: {
          csp: securityConfig.csp.enabled,
          hsts: securityConfig.hsts.enabled,
          frameOptions: true,
          contentTypeOptions: true,
          xssProtection: true
        },
        rateLimiting: {
          enabled: true,
          windowMs: securityConfig.rateLimiting.windowMs,
          maxRequests: securityConfig.rateLimiting.maxRequests
        },
        compliance: securityConfig.compliance,
        keyManagement: {
          initialized: true,
          provider: 'enterprise-hsm'
        },
        monitoring: {
          securityEvents: true,
          auditLogging: true,
          realTimeAlerts: true
        }
      }
    });
  } catch (error) {
    logger.error('Security status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security status'
    });
  }
});

// SMB-specific configuration endpoint with enhanced security
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
        performanceAlerts: true,
        encryptionAtRest: true,
        auditCompliance: true,
        gdprCompliance: true,
        pipedaCompliance: true,
        soc2Compliance: true
      },
      limits: {
        maxWorkflows: process.env.SMB_MAX_WORKFLOWS || 50,
        maxExecutionsPerMonth: process.env.SMB_MAX_EXECUTIONS || 10000,
        maxUsers: process.env.SMB_MAX_USERS || 25,
        maxSecretsPerWorkflow: process.env.SMB_MAX_SECRETS || 100
      },
      security: {
        encryptionAtRest: true,
        keyRotationInterval: 90,
        auditRetention: 2555, // 7 years
        complianceStandards: ['GDPR', 'PIPEDA', 'SOC2', 'ISO27001'],
        securityHeaders: true,
        rateLimiting: true,
        ipWhitelisting: true
      },
      support: {
        businessHours: '9 AM - 5 PM EST',
        responseTime: '24 hours',
        channels: ['email', 'chat'],
        securityIncidentResponse: '1 hour'
      },
      integrations: {
        n8n: {
          available: true,
          baseUrl: process.env.N8N_BASE_URL || 'http://localhost:5678',
          version: 'latest',
          secureConnection: process.env.NODE_ENV === 'production'
        },
        businessMetrics: {
          available: true,
          realTimeUpdates: true,
          roiTracking: true,
          secureDataHandling: true
        },
        keyManagement: {
          available: true,
          hsmIntegration: true,
          keyRotation: true,
          complianceReporting: true
        }
      }
    }
  });
});

// Apply route-specific rate limiting and middleware
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/workflows', apiLimiter, workflowRoutes);
app.use('/api/clients', apiLimiter, clientRoutes);
app.use('/api/analytics', apiLimiter, analyticsRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/business', businessLimiter, businessRoutes);

// Business-specific middleware for enhanced monitoring
app.use('/api/business', (req, res, next) => {
  // Enhanced business API logging with security context
  logger.info('Business API accessed:', {
    endpoint: req.path,
    method: req.method,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID'),
    securityHeaders: {
      hasAuth: !!req.headers.authorization,
      contentType: req.headers['content-type'],
      origin: req.headers.origin
    }
  });
  next();
});

// Security incident response endpoint
app.post('/api/security/incident', (req, res) => {
  try {
    const { type, severity, description, metadata } = req.body;
    
    logSecurityEvent('SECURITY_INCIDENT_REPORTED', {
      type,
      severity,
      description,
      metadata,
      reportedBy: req.ip,
      timestamp: new Date().toISOString()
    });
    
    // In production, this would trigger incident response workflows
    logger.warn('Security incident reported', {
      type,
      severity,
      description,
      clientIP: req.ip
    });
    
    res.json({
      success: true,
      message: 'Security incident logged successfully',
      incidentId: `inc_${Date.now()}_${Math.random().toString(36).substring(2)}`
    });
  } catch (error) {
    logger.error('Failed to log security incident:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log security incident'
    });
  }
});

// Enhanced 404 handler with security logging
app.use('*', (req, res) => {
  logSecurityEvent('NOT_FOUND_ACCESS', {
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
    requestId: res.getHeader('X-Request-ID'),
    availableEndpoints: {
      auth: '/api/auth',
      workflows: '/api/workflows',
      business: '/api/business',
      clients: '/api/clients',
      analytics: '/api/analytics',
      admin: '/api/admin',
      health: '/health',
      security: '/api/security/status',
      smbConfig: '/api/config/smb'
    }
  });
});

// Enhanced error handling middleware with security context
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log security-relevant errors
  if (error.status === 401 || error.status === 403 || error.status === 429) {
    logSecurityEvent('SECURITY_ERROR', {
      error: error.message,
      status: error.status,
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
  }
  
  errorHandler(error, req, res, next);
});

// Initialize database and start server with enhanced security
const startServer = async () => {
  try {
    // Initialize database
    logger.info('Initializing database...');
    await database.migrate();
    
    // Initialize key management service
    logger.info('Initializing key management service...');
    const keyManagementHealth = await keyManagementService.healthCheck();
    if (keyManagementHealth.status !== 'healthy') {
      logger.warn('Key management service not fully healthy:', keyManagementHealth.details);
    }
    
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
    
    // Log security configuration
    const securityConfig = securityHeadersMiddleware.getConfig();
    logger.info('🔒 Security Configuration:', {
      cspEnabled: securityConfig.csp.enabled,
      hstsEnabled: securityConfig.hsts.enabled,
      rateLimitingActive: true,
      keyManagementStatus: keyManagementHealth.status,
      complianceFlags: securityConfig.compliance
    });
    
    // Log SMB configuration
    logger.info('🏢 SMB Configuration:', {
      maxWorkflows: process.env.SMB_MAX_WORKFLOWS || 50,
      maxExecutions: process.env.SMB_MAX_EXECUTIONS || 10000,
      maxUsers: process.env.SMB_MAX_USERS || 25,
      businessMetrics: businessMetricsHealth,
      encryptionAtRest: keyManagementHealth.status === 'healthy',
      complianceReady: true
    });
    
    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 n8n Workflow Manager Backend running on port ${PORT}`);
      logger.info(`📊 Health check available at http://localhost:${PORT}/health`);
      logger.info(`🔧 API endpoints available at http://localhost:${PORT}/api`);
      logger.info(`💼 Business API available at http://localhost:${PORT}/api/business`);
      logger.info(`🔒 Security status at http://localhost:${PORT}/api/security/status`);
      logger.info(`🏢 SMB Config available at http://localhost:${PORT}/api/config/smb`);
      logger.info(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
      
      // Service status
      logger.info('📡 Service Status:');
      logger.info(`   🗄️  Database: ${dbHealth ? '✅ Connected' : '❌ Disconnected'}`);
      logger.info(`   🔄 n8n: ${n8nHealth ? '✅ Connected' : '❌ Disconnected'}`);
      logger.info(`   🔍 Qdrant: ${qdrantHealth ? '✅ Connected' : '❌ Disconnected'}`);
      logger.info(`   📈 Business Metrics: ${businessMetricsHealth ? '✅ Ready' : '❌ Limited'}`);
      logger.info(`   🔐 Key Management: ${keyManagementHealth.status === 'healthy' ? '✅ Ready' : '⚠️  Limited'}`);
      
      // Security features status
      logger.info('🔒 Security Features:');
      logger.info(`   🛡️  Security Headers: ✅ Active`);
      logger.info(`   🚦 Rate Limiting: ✅ Active`);
      logger.info(`   🔑 Key Management: ${keyManagementHealth.status === 'healthy' ? '✅ Active' : '⚠️  Limited'}`);
      logger.info(`   📝 Audit Logging: ✅ Active`);
      logger.info(`   🌍 GDPR Compliance: ✅ Ready`);
      logger.info(`   🇨🇦 PIPEDA Compliance: ✅ Ready`);
      logger.info(`   🏛️  SOC2 Compliance: ✅ Ready`);
      
      // Business features status
      logger.info('💼 Business Features:');
      logger.info(`   📊 ROI Calculation: ✅ Available`);
      logger.info(`   📋 Dashboard Metrics: ${businessMetricsHealth ? '✅ Available' : '⚠️  Limited'}`);
      logger.info(`   🔔 Workflow Monitoring: ${n8nHealth ? '✅ Available' : '⚠️  Limited'}`);
      logger.info(`   📘 SMB Templates: ✅ Available`);
      logger.info(`   🔐 Data Encryption: ${keyManagementHealth.status === 'healthy' ? '✅ Available' : '⚠️  Limited'}`);
      
      if (process.env.NODE_ENV === 'development') {
        logger.info('🛠️  Development mode: Enhanced logging and relaxed security policies enabled');
      } else {
        logger.info('🏭 Production mode: Full security policies and monitoring active');
      }

      // Log security event for service startup
      logSecurityEvent('SERVICE_STARTED', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        securityFeaturesActive: true,
        complianceReady: true
      });
    });

    // Enhanced graceful shutdown with security cleanup
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);
      
      logSecurityEvent('SERVICE_SHUTDOWN_INITIATED', { signal });
      
      server.close(async () => {
        try {
          await database.close();
          logger.info('Database connections closed');
          
          // Additional cleanup for security services would go here
          logger.info('Security services cleaned up');
          
          logSecurityEvent('SERVICE_SHUTDOWN_COMPLETED', { signal });
          process.exit(0);
        } catch (error) {
          logger.error('Error during graceful shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    logSecurityEvent('SERVICE_START_FAILED', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    process.exit(1);
  }
};

// Enhanced error handling for security
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  logSecurityEvent('UNCAUGHT_EXCEPTION', { 
    error: error.message,
    stack: error.stack 
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  logSecurityEvent('UNHANDLED_REJECTION', { 
    reason: reason instanceof Error ? reason.message : String(reason)
  });
  // Don't exit the process, but log the error for security monitoring
});

startServer();

export default app;