import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { logger } from '../utils/logger';

// Security configuration interface
export interface SecurityConfig {
  csp: {
    enabled: boolean;
    directives: Record<string, string[]>;
    reportOnly: boolean;
    reportUri?: string;
  };
  hsts: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  rateLimiting: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
    keyGenerator?: (req: Request) => string;
  };
  ipWhitelist: string[];
  trustedDomains: string[];
  compliance: {
    gdpr: boolean;
    pipeda: boolean;
    soc2: boolean;
    iso27001: boolean;
  };
}

// Default security configuration
const defaultSecurityConfig: SecurityConfig = {
  csp: {
    enabled: true,
    reportOnly: process.env.NODE_ENV === 'development',
    directives: {
      'default-src': ["'self'"],
      'script-src': [
        "'self'",
        "'unsafe-inline'", // Only for development - remove in production
        "'unsafe-eval'", // Only for development - remove in production
        'https://cdn.jsdelivr.net',
        'https://unpkg.com'
      ],
      'style-src': [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdn.jsdelivr.net'
      ],
      'font-src': [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdn.jsdelivr.net'
      ],
      'img-src': [
        "'self'",
        'data:',
        'https:',
        'blob:'
      ],
      'connect-src': [
        "'self'",
        'https://api.github.com',
        'https://n8n.io',
        process.env.N8N_BASE_URL || 'http://localhost:5678',
        process.env.QDRANT_URL || 'http://localhost:6333'
      ],
      'frame-ancestors': ["'none'"],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'manifest-src': ["'self'"],
      'media-src': ["'self'"],
      'worker-src': ["'self'", 'blob:'],
      'upgrade-insecure-requests': []
    }
  },
  hsts: {
    enabled: process.env.NODE_ENV === 'production',
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  rateLimiting: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: process.env.NODE_ENV === 'production' ? 100 : 1000,
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  },
  ipWhitelist: [
    '127.0.0.1',
    '::1',
    '10.0.0.0/8',
    '172.16.0.0/12',
    '192.168.0.0/16'
  ],
  trustedDomains: [
    'localhost',
    '127.0.0.1',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ].filter(Boolean),
  compliance: {
    gdpr: true,
    pipeda: true,
    soc2: true,
    iso27001: true
  }
};

/**
 * Enhanced security headers middleware class
 */
export class SecurityHeadersMiddleware {
  private config: SecurityConfig;
  private rateLimiter: any;

  constructor(config?: Partial<SecurityConfig>) {
    this.config = { ...defaultSecurityConfig, ...config };
    this.initializeRateLimiter();
  }

  /**
   * Initialize rate limiter with custom configuration
   */
  private initializeRateLimiter(): void {
    this.rateLimiter = rateLimit({
      windowMs: this.config.rateLimiting.windowMs,
      max: this.config.rateLimiting.maxRequests,
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(this.config.rateLimiting.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req: Request) => {
        // Skip rate limiting for whitelisted IPs
        const clientIP = this.getClientIP(req);
        return this.isWhitelistedIP(clientIP);
      },
      keyGenerator: this.config.rateLimiting.keyGenerator || ((req: Request) => this.getClientIP(req)),
      skipSuccessfulRequests: this.config.rateLimiting.skipSuccessfulRequests,
      skipFailedRequests: this.config.rateLimiting.skipFailedRequests,
      onLimitReached: (req: Request) => {
        logger.warn('Rate limit exceeded', {
          ip: this.getClientIP(req),
          userAgent: req.headers['user-agent'],
          path: req.path,
          method: req.method,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Main security headers middleware
   */
  public middleware() {
    return [
      // Apply rate limiting first
      this.rateLimiter,
      
      // Apply basic helmet security
      helmet({
        contentSecurityPolicy: false, // We'll handle CSP manually for better control
        hsts: this.config.hsts.enabled ? {
          maxAge: this.config.hsts.maxAge,
          includeSubDomains: this.config.hsts.includeSubDomains,
          preload: this.config.hsts.preload
        } : false,
        frameguard: { action: 'deny' },
        noSniff: true,
        xssFilter: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        crossOriginResourcePolicy: { policy: 'cross-origin' }
      }),

      // Custom security headers middleware
      (req: Request, res: Response, next: NextFunction) => {
        this.applyCustomSecurityHeaders(req, res);
        next();
      },

      // CSP middleware
      this.cspMiddleware(),

      // Request validation middleware
      this.requestValidationMiddleware(),

      // Compliance headers middleware
      this.complianceHeadersMiddleware()
    ];
  }

  /**
   * Apply custom security headers
   */
  private applyCustomSecurityHeaders(req: Request, res: Response): void {
    // Security headers for enterprise compliance
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    
    // Additional security headers
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Permissions Policy (Feature Policy)
    const permissionsPolicy = [
      'accelerometer=()',
      'ambient-light-sensor=()',
      'autoplay=()',
      'battery=()',
      'camera=()',
      'cross-origin-isolated=()',
      'display-capture=()',
      'document-domain=()',
      'encrypted-media=()',
      'execution-while-not-rendered=()',
      'execution-while-out-of-viewport=()',
      'fullscreen=()',
      'geolocation=()',
      'gyroscope=()',
      'magnetometer=()',
      'microphone=()',
      'midi=()',
      'navigation-override=()',
      'payment=()',
      'picture-in-picture=()',
      'publickey-credentials-get=()',
      'screen-wake-lock=()',
      'sync-xhr=()',
      'usb=()',
      'web-share=()',
      'xr-spatial-tracking=()'
    ].join(', ');
    
    res.setHeader('Permissions-Policy', permissionsPolicy);

    // Cache control for security
    if (req.path.includes('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // Server identification removal
    res.removeHeader('X-Powered-By');
    res.setHeader('Server', 'n8n-workflow-manager');
  }

  /**
   * Content Security Policy middleware
   */
  private cspMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.csp.enabled) {
        return next();
      }

      const directives = Object.entries(this.config.csp.directives)
        .map(([key, values]) => {
          if (values.length === 0) {
            return key;
          }
          return `${key} ${values.join(' ')}`;
        })
        .join('; ');

      const headerName = this.config.csp.reportOnly ? 
        'Content-Security-Policy-Report-Only' : 
        'Content-Security-Policy';

      let cspHeader = directives;
      if (this.config.csp.reportUri) {
        cspHeader += `; report-uri ${this.config.csp.reportUri}`;
      }

      res.setHeader(headerName, cspHeader);
      next();
    };
  }

  /**
   * Request validation middleware
   */
  private requestValidationMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate request size
        const contentLength = parseInt(req.headers['content-length'] || '0');
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (contentLength > maxSize) {
          logger.warn('Request too large', {
            ip: this.getClientIP(req),
            size: contentLength,
            path: req.path,
            method: req.method
          });
          return res.status(413).json({
            success: false,
            error: 'Request entity too large',
            code: 'REQUEST_TOO_LARGE'
          });
        }

        // Validate User-Agent
        const userAgent = req.headers['user-agent'];
        if (!userAgent || userAgent.length > 1000) {
          logger.warn('Invalid User-Agent', {
            ip: this.getClientIP(req),
            userAgent: userAgent?.substring(0, 100) + '...',
            path: req.path
          });
          return res.status(400).json({
            success: false,
            error: 'Invalid request headers',
            code: 'INVALID_HEADERS'
          });
        }

        // Validate Host header
        const host = req.headers.host;
        if (host && !this.isTrustedDomain(host)) {
          logger.warn('Untrusted host header', {
            ip: this.getClientIP(req),
            host,
            path: req.path
          });
          return res.status(400).json({
            success: false,
            error: 'Invalid host header',
            code: 'INVALID_HOST'
          });
        }

        // Check for suspicious patterns in URL
        if (this.containsSuspiciousPatterns(req.url)) {
          logger.warn('Suspicious request pattern detected', {
            ip: this.getClientIP(req),
            url: req.url,
            method: req.method,
            userAgent: req.headers['user-agent']
          });
          return res.status(400).json({
            success: false,
            error: 'Invalid request pattern',
            code: 'SUSPICIOUS_PATTERN'
          });
        }

        next();
      } catch (error) {
        logger.error('Request validation error:', error);
        return res.status(500).json({
          success: false,
          error: 'Internal server error',
          code: 'VALIDATION_ERROR'
        });
      }
    };
  }

  /**
   * Compliance headers middleware
   */
  private complianceHeadersMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (this.config.compliance.gdpr) {
        res.setHeader('X-GDPR-Compliant', 'true');
        res.setHeader('X-Data-Protection', 'EU-GDPR');
      }

      if (this.config.compliance.pipeda) {
        res.setHeader('X-PIPEDA-Compliant', 'true');
        res.setHeader('X-Privacy-Framework', 'CA-PIPEDA');
      }

      if (this.config.compliance.soc2) {
        res.setHeader('X-SOC2-Compliant', 'true');
        res.setHeader('X-Security-Framework', 'SOC2-Type2');
      }

      if (this.config.compliance.iso27001) {
        res.setHeader('X-ISO27001-Compliant', 'true');
        res.setHeader('X-Information-Security', 'ISO27001:2013');
      }

      // Add audit trail headers
      res.setHeader('X-Request-ID', this.generateRequestId());
      res.setHeader('X-Timestamp', new Date().toISOString());

      next();
    };
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIP = req.headers['x-real-ip'] as string;
    const cfConnectingIP = req.headers['cf-connecting-ip'] as string;
    
    return cfConnectingIP || 
           realIP || 
           (forwarded ? forwarded.split(',')[0].trim() : '') || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress || 
           '0.0.0.0';
  }

  /**
   * Check if IP is whitelisted
   */
  private isWhitelistedIP(ip: string): boolean {
    // Simple IP whitelist check (in production, use proper CIDR matching)
    return this.config.ipWhitelist.some(whitelistedIP => {
      if (whitelistedIP.includes('/')) {
        // CIDR notation - for production, implement proper CIDR matching
        const [network] = whitelistedIP.split('/');
        return ip.startsWith(network.split('.').slice(0, 2).join('.'));
      }
      return ip === whitelistedIP;
    });
  }

  /**
   * Check if domain is trusted
   */
  private isTrustedDomain(host: string): boolean {
    const hostname = host.split(':')[0]; // Remove port
    return this.config.trustedDomains.some(domain => {
      if (domain.startsWith('http')) {
        const url = new URL(domain);
        return url.hostname === hostname;
      }
      return domain === hostname;
    });
  }

  /**
   * Check for suspicious patterns in URL
   */
  private containsSuspiciousPatterns(url: string): boolean {
    const suspiciousPatterns = [
      // SQL injection patterns
      /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
      // XSS patterns
      /<script[^>]*>.*?<\/script>/gi,
      /javascript:|vbscript:|onload=|onerror=/i,
      // Path traversal
      /\.\.\/|\.\.\\|\.\.\%2f|\.\.\%5c/i,
      // Command injection
      /;\s*(cat|ls|pwd|whoami|id|uname|ps|netstat|ifconfig)/i,
      // Common attack patterns
      /(\b(eval|exec|system|shell_exec|passthru|base64_decode)\b)/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Generate unique request ID for audit trails
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Update security configuration
   */
  public updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeRateLimiter();
  }

  /**
   * Get current security configuration
   */
  public getConfig(): SecurityConfig {
    return { ...this.config };
  }
}

// Export configured middleware instance
export const securityHeadersMiddleware = new SecurityHeadersMiddleware();

// Export specific rate limiters for different endpoints
export const createBusinessRateLimiter = () => rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // Higher limit for business operations
  message: {
    success: false,
    error: 'Business API rate limit exceeded. Please try again later.',
    code: 'BUSINESS_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const createAuthRateLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Strict limit for auth attempts
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true
});

export const createAPIRateLimiter = () => rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000,
  message: {
    success: false,
    error: 'API rate limit exceeded. Please try again later.',
    code: 'API_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Security audit logging
export const logSecurityEvent = (eventType: string, details: Record<string, any>): void => {
  logger.warn(`SECURITY_EVENT: ${eventType}`, {
    timestamp: new Date().toISOString(),
    eventType,
    ...details
  });
};