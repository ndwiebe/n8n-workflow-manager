import express from 'express';

export interface CookieConsentData {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
  timestamp: string;
  version: string;
}

/**
 * Cookie Consent Middleware
 * Enforces cookie consent policies and manages cookie lifecycle
 * Complies with GDPR Article 7 (Consent) and ePrivacy Directive
 */
export const cookieConsentMiddleware = (options: {
  requireConsent?: boolean;
  defaultConsent?: Partial<CookieConsentData>;
  consentCookieName?: string;
} = {}) => {
  const {
    requireConsent = true,
    defaultConsent = { necessary: true, analytics: false, marketing: false, personalization: false },
    consentCookieName = 'cookieConsent'
  } = options;

  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Add cookie consent utilities to request object
    req.cookieConsent = {
      hasConsent: (category: keyof CookieConsentData) => hasConsent(req, category, consentCookieName),
      getConsentData: () => getConsentData(req, consentCookieName),
      setConsentCookie: (consentData: CookieConsentData) => setConsentCookie(res, consentData, consentCookieName),
      clearNonEssentialCookies: () => clearNonEssentialCookies(req, res),
      enforceConsent: (category: keyof CookieConsentData) => enforceConsent(req, res, category, consentCookieName)
    };

    // Check and enforce consent policies
    const consentData = getConsentData(req, consentCookieName);
    
    if (!consentData && requireConsent) {
      // Set default consent (necessary cookies only)
      const defaultConsentData: CookieConsentData = {
        ...defaultConsent,
        necessary: true, // Always allow necessary cookies
        timestamp: new Date().toISOString(),
        version: '1.0'
      } as CookieConsentData;
      
      setConsentCookie(res, defaultConsentData, consentCookieName);
      req.cookieConsent!.consentData = defaultConsentData;
    } else if (consentData) {
      req.cookieConsent!.consentData = consentData;
      
      // Check if consent is still valid (13 months per GDPR)
      const consentDate = new Date(consentData.timestamp);
      const now = new Date();
      const monthsDiff = (now.getTime() - consentDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsDiff > 13) {
        // Consent expired, clear non-essential cookies
        clearNonEssentialCookies(req, res);
        
        // Reset to default consent
        const refreshedConsent: CookieConsentData = {
          ...defaultConsent,
          necessary: true,
          timestamp: new Date().toISOString(),
          version: '1.0'
        } as CookieConsentData;
        
        setConsentCookie(res, refreshedConsent, consentCookieName);
        req.cookieConsent!.consentData = refreshedConsent;
      }
    }

    // Set response headers for cookie transparency
    res.setHeader('X-Cookie-Policy', 'https://your-domain.com/cookie-policy');
    res.setHeader('X-Privacy-Policy', 'https://your-domain.com/privacy-policy');

    next();
  };
};

/**
 * Analytics Cookie Middleware
 * Only sets analytics cookies if consent is granted
 */
export const analyticsMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.cookieConsent?.hasConsent('analytics')) {
    // Allow analytics cookies
    res.locals.analyticsEnabled = true;
  } else {
    // Block analytics cookies and scripts
    res.locals.analyticsEnabled = false;
    
    // Remove analytics cookies if they exist
    const analyticsCookies = ['_ga', '_gid', '_gat', '_gtag_*', 'amplitude_*', '_hjid'];
    analyticsCookies.forEach(cookieName => {
      if (cookieName.includes('*')) {
        // Handle wildcard patterns
        const prefix = cookieName.replace('*', '');
        Object.keys(req.cookies).forEach(cookie => {
          if (cookie.startsWith(prefix)) {
            res.clearCookie(cookie, { 
              path: '/', 
              domain: req.hostname.startsWith('www.') ? req.hostname.substring(4) : req.hostname 
            });
          }
        });
      } else {
        res.clearCookie(cookieName, { 
          path: '/', 
          domain: req.hostname.startsWith('www.') ? req.hostname.substring(4) : req.hostname 
        });
      }
    });
  }
  
  next();
};

/**
 * Marketing Cookie Middleware
 * Only sets marketing cookies if consent is granted
 */
export const marketingMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.cookieConsent?.hasConsent('marketing')) {
    res.locals.marketingEnabled = true;
  } else {
    res.locals.marketingEnabled = false;
    
    // Remove marketing cookies
    const marketingCookies = ['fbp', '_fbp', 'fr', '_gcl_*', 'ads_*', '_ttp'];
    marketingCookies.forEach(cookieName => {
      if (cookieName.includes('*')) {
        const prefix = cookieName.replace('*', '');
        Object.keys(req.cookies).forEach(cookie => {
          if (cookie.startsWith(prefix)) {
            res.clearCookie(cookie, { 
              path: '/', 
              domain: req.hostname.startsWith('www.') ? req.hostname.substring(4) : req.hostname 
            });
          }
        });
      } else {
        res.clearCookie(cookieName, { 
          path: '/', 
          domain: req.hostname.startsWith('www.') ? req.hostname.substring(4) : req.hostname 
        });
      }
    });
  }
  
  next();
};

/**
 * Personalization Cookie Middleware
 */
export const personalizationMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.cookieConsent?.hasConsent('personalization')) {
    res.locals.personalizationEnabled = true;
  } else {
    res.locals.personalizationEnabled = false;
    
    // Remove personalization cookies
    const personalizationCookies = ['pref_*', 'settings_*', 'theme', 'language'];
    personalizationCookies.forEach(cookieName => {
      if (cookieName.includes('*')) {
        const prefix = cookieName.replace('*', '');
        Object.keys(req.cookies).forEach(cookie => {
          if (cookie.startsWith(prefix)) {
            res.clearCookie(cookie, { path: '/' });
          }
        });
      } else {
        res.clearCookie(cookieName, { path: '/' });
      }
    });
  }
  
  next();
};

// Helper functions
function hasConsent(req: express.Request, category: keyof CookieConsentData, cookieName: string): boolean {
  const consentData = getConsentData(req, cookieName);
  return consentData ? consentData[category] === true : false;
}

function getConsentData(req: express.Request, cookieName: string): CookieConsentData | null {
  try {
    const consentCookie = req.cookies[cookieName];
    return consentCookie ? JSON.parse(consentCookie) : null;
  } catch (error) {
    console.error('Error parsing consent cookie:', error);
    return null;
  }
}

function setConsentCookie(res: express.Response, consentData: CookieConsentData, cookieName: string): void {
  const cookieOptions = {
    httpOnly: false, // Allow JavaScript access for client-side consent management
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict' as const,
    maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
    path: '/'
  };

  res.cookie(cookieName, JSON.stringify(consentData), cookieOptions);
}

function clearNonEssentialCookies(req: express.Request, res: express.Response): void {
  const nonEssentialCookies = [
    // Analytics
    '_ga', '_gid', '_gat', '_gtag_*', 'amplitude_*', '_hjid', '_hjSession*',
    // Marketing
    'fbp', '_fbp', 'fr', '_gcl_*', 'ads_*', '_ttp', '_ttd_*',
    // Personalization
    'pref_*', 'settings_*', 'theme', 'language', 'customization_*'
  ];

  nonEssentialCookies.forEach(cookieName => {
    if (cookieName.includes('*')) {
      const prefix = cookieName.replace('*', '');
      Object.keys(req.cookies).forEach(cookie => {
        if (cookie.startsWith(prefix)) {
          res.clearCookie(cookie, { 
            path: '/', 
            domain: req.hostname.startsWith('www.') ? req.hostname.substring(4) : req.hostname 
          });
        }
      });
    } else {
      res.clearCookie(cookieName, { 
        path: '/', 
        domain: req.hostname.startsWith('www.') ? req.hostname.substring(4) : req.hostname 
      });
    }
  });
}

function enforceConsent(req: express.Request, res: express.Response, category: keyof CookieConsentData, cookieName: string): boolean {
  const hasConsentForCategory = hasConsent(req, category, cookieName);
  
  if (!hasConsentForCategory) {
    // Log consent violation for audit
    console.warn(`Consent violation: ${category} action attempted without consent`, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      timestamp: new Date().toISOString()
    });
    
    return false;
  }
  
  return true;
}

// Type extension for Express Request
declare global {
  namespace Express {
    interface Request {
      cookieConsent?: {
        hasConsent: (category: keyof CookieConsentData) => boolean;
        getConsentData: () => CookieConsentData | null;
        setConsentCookie: (consentData: CookieConsentData) => void;
        clearNonEssentialCookies: () => void;
        enforceConsent: (category: keyof CookieConsentData) => boolean;
        consentData?: CookieConsentData;
      };
    }
  }
}

/**
 * GDPR Compliance Headers Middleware
 * Adds headers for GDPR transparency and compliance
 */
export const gdprHeadersMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Add GDPR compliance headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // GDPR specific headers
  res.setHeader('X-GDPR-Compliant', 'true');
  res.setHeader('X-Data-Controller', 'n8n Workflow Manager');
  res.setHeader('X-Privacy-Contact', 'dpo@n8n-workflow-manager.com');
  
  next();
};

/**
 * Session Privacy Middleware
 * Ensures session cookies are secure and compliant
 */
export const sessionPrivacyMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Ensure session cookies are secure
  if (req.session) {
    req.session.cookie.secure = process.env.NODE_ENV === 'production';
    req.session.cookie.httpOnly = true;
    req.session.cookie.sameSite = 'strict';
    
    // Set session timeout for privacy (2 hours)
    req.session.cookie.maxAge = 2 * 60 * 60 * 1000;
  }
  
  next();
};