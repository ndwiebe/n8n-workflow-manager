import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { privacyComplianceService } from '../services/privacyComplianceService';
import { authMiddleware } from '../middleware/auth';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { logDataAccess } from '../middleware/auditLog';

const router = express.Router();

// Apply authentication and rate limiting to all privacy routes
router.use(authMiddleware);
router.use(rateLimitMiddleware({ windowMs: 15 * 60 * 1000, max: 100 })); // 100 requests per 15 minutes

// Validation middleware
const handleValidationErrors = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * GET /api/privacy/user-data
 * Returns comprehensive user data for transparency (GDPR Art. 15)
 */
router.get('/user-data', 
  logDataAccess('user_data_access'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const userData = await privacyComplianceService.getUserData(userId);
      res.json(userData);
    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  }
);

/**
 * POST /api/privacy/export
 * Request data export (GDPR Art. 20 - Right to Data Portability)
 */
router.post('/export',
  [
    body('categories').isArray().withMessage('Categories must be an array'),
    body('format').isIn(['json', 'csv', 'xml']).withMessage('Invalid format'),
    body('includeDeleted').optional().isBoolean(),
  ],
  handleValidationErrors,
  logDataAccess('data_export_request'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { categories, format, includeDeleted, dateRange } = req.body;
      
      const exportRequest = await privacyComplianceService.requestDataExport(userId, {
        categories,
        format,
        includeDeleted: includeDeleted || false,
        dateRange
      });

      res.json(exportRequest);
    } catch (error) {
      console.error('Error requesting data export:', error);
      res.status(500).json({ error: 'Failed to request data export' });
    }
  }
);

/**
 * GET /api/privacy/exports
 * Get export history for user
 */
router.get('/exports',
  logDataAccess('export_history_access'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const exports = await privacyComplianceService.getExportHistory(userId);
      res.json(exports);
    } catch (error) {
      console.error('Error fetching export history:', error);
      res.status(500).json({ error: 'Failed to fetch export history' });
    }
  }
);

/**
 * GET /api/privacy/exports/:exportId
 * Get specific export status
 */
router.get('/exports/:exportId',
  [param('exportId').isUUID().withMessage('Invalid export ID')],
  handleValidationErrors,
  logDataAccess('export_status_check'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      const { exportId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const exportData = await privacyComplianceService.getExportStatus(userId, exportId);
      if (!exportData) {
        return res.status(404).json({ error: 'Export not found' });
      }

      res.json(exportData);
    } catch (error) {
      console.error('Error fetching export status:', error);
      res.status(500).json({ error: 'Failed to fetch export status' });
    }
  }
);

/**
 * POST /api/privacy/requests
 * Submit data subject rights request (GDPR Art. 16-21)
 */
router.post('/requests',
  [
    body('type').isIn(['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'])
      .withMessage('Invalid request type'),
    body('description').isString().isLength({ min: 10, max: 2000 })
      .withMessage('Description must be between 10-2000 characters'),
  ],
  handleValidationErrors,
  logDataAccess('data_subject_request'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { type, description } = req.body;
      
      const request = await privacyComplianceService.submitDataRequest(userId, type, description);
      res.json(request);
    } catch (error) {
      console.error('Error submitting data request:', error);
      res.status(500).json({ error: 'Failed to submit data request' });
    }
  }
);

/**
 * GET /api/privacy/requests
 * Get user's data subject rights requests
 */
router.get('/requests',
  logDataAccess('data_requests_access'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const requests = await privacyComplianceService.getDataRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error('Error fetching data requests:', error);
      res.status(500).json({ error: 'Failed to fetch data requests' });
    }
  }
);

/**
 * GET /api/privacy/requests/:requestId
 * Get specific data request status
 */
router.get('/requests/:requestId',
  [param('requestId').isUUID().withMessage('Invalid request ID')],
  handleValidationErrors,
  logDataAccess('data_request_status'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      const { requestId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const request = await privacyComplianceService.getDataRequestStatus(userId, requestId);
      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }

      res.json(request);
    } catch (error) {
      console.error('Error fetching request status:', error);
      res.status(500).json({ error: 'Failed to fetch request status' });
    }
  }
);

/**
 * POST /api/privacy/delete-account
 * Request account deletion (GDPR Art. 17 - Right to Erasure)
 */
router.post('/delete-account',
  [body('reason').optional().isString().isLength({ max: 1000 })],
  handleValidationErrors,
  logDataAccess('account_deletion_request'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const { reason } = req.body;
      
      const request = await privacyComplianceService.requestAccountDeletion(userId, reason);
      res.json(request);
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      res.status(500).json({ error: 'Failed to request account deletion' });
    }
  }
);

/**
 * POST /api/privacy/delete-account/:requestId/cancel
 * Cancel account deletion request
 */
router.post('/delete-account/:requestId/cancel',
  [param('requestId').isUUID().withMessage('Invalid request ID')],
  handleValidationErrors,
  logDataAccess('account_deletion_cancel'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      const { requestId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await privacyComplianceService.cancelAccountDeletion(userId, requestId);
      res.json({ message: 'Account deletion cancelled successfully' });
    } catch (error) {
      console.error('Error cancelling account deletion:', error);
      res.status(500).json({ error: 'Failed to cancel account deletion' });
    }
  }
);

/**
 * POST /api/privacy/consent
 * Record user consent
 */
router.post('/consent',
  [
    body('consentType').isIn(['cookies', 'privacy_policy', 'marketing', 'analytics'])
      .withMessage('Invalid consent type'),
    body('granted').isBoolean().withMessage('Granted must be boolean'),
    body('version').isString().withMessage('Version is required'),
    body('timestamp').isISO8601().withMessage('Invalid timestamp'),
    body('ipAddress').optional().isIP(),
    body('userAgent').optional().isString(),
  ],
  handleValidationErrors,
  logDataAccess('consent_record'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const consentData = {
        userId,
        ...req.body,
        ipAddress: req.body.ipAddress || req.ip,
        userAgent: req.body.userAgent || req.get('User-Agent') || 'unknown'
      };
      
      const consent = await privacyComplianceService.recordConsent(consentData);
      res.json(consent);
    } catch (error) {
      console.error('Error recording consent:', error);
      res.status(500).json({ error: 'Failed to record consent' });
    }
  }
);

/**
 * GET /api/privacy/consent-history
 * Get user's consent history
 */
router.get('/consent-history',
  logDataAccess('consent_history_access'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const history = await privacyComplianceService.getConsentHistory(userId);
      res.json(history);
    } catch (error) {
      console.error('Error fetching consent history:', error);
      res.status(500).json({ error: 'Failed to fetch consent history' });
    }
  }
);

/**
 * POST /api/privacy/consent/:consentId/withdraw
 * Withdraw specific consent
 */
router.post('/consent/:consentId/withdraw',
  [param('consentId').isUUID().withMessage('Invalid consent ID')],
  handleValidationErrors,
  logDataAccess('consent_withdrawal'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      const { consentId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await privacyComplianceService.withdrawConsent(userId, consentId);
      res.json({ message: 'Consent withdrawn successfully' });
    } catch (error) {
      console.error('Error withdrawing consent:', error);
      res.status(500).json({ error: 'Failed to withdraw consent' });
    }
  }
);

/**
 * PATCH /api/privacy/personal-info
 * Update personal information (GDPR Art. 16 - Right to Rectification)
 */
router.patch('/personal-info',
  [
    body('email').optional().isEmail().withMessage('Invalid email'),
    body('name').optional().isString().isLength({ min: 1, max: 100 }),
  ],
  handleValidationErrors,
  logDataAccess('personal_info_update'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await privacyComplianceService.updatePersonalInfo(userId, req.body);
      res.json({ message: 'Personal information updated successfully' });
    } catch (error) {
      console.error('Error updating personal info:', error);
      res.status(500).json({ error: 'Failed to update personal information' });
    }
  }
);

/**
 * PATCH /api/privacy/preferences
 * Update user preferences
 */
router.patch('/preferences',
  logDataAccess('preferences_update'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await privacyComplianceService.updatePreferences(userId, req.body);
      res.json({ message: 'Preferences updated successfully' });
    } catch (error) {
      console.error('Error updating preferences:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  }
);

/**
 * GET /api/privacy/processing-activities
 * Get data processing activities (GDPR Art. 30 compliance)
 */
router.get('/processing-activities',
  logDataAccess('processing_activities_access'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const activities = await privacyComplianceService.getProcessingActivities(userId);
      res.json(activities);
    } catch (error) {
      console.error('Error fetching processing activities:', error);
      res.status(500).json({ error: 'Failed to fetch processing activities' });
    }
  }
);

/**
 * GET /api/privacy/cookie-consent
 * Get current cookie consent settings
 */
router.get('/cookie-consent',
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const consent = await privacyComplianceService.getCookieConsent(userId);
      res.json(consent);
    } catch (error) {
      console.error('Error fetching cookie consent:', error);
      res.status(500).json({ error: 'Failed to fetch cookie consent' });
    }
  }
);

/**
 * POST /api/privacy/cookie-consent
 * Update cookie consent settings
 */
router.post('/cookie-consent',
  logDataAccess('cookie_consent_update'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const consentData = {
        userId,
        ...req.body,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
        timestamp: new Date().toISOString()
      };

      await privacyComplianceService.updateCookieConsent(consentData);
      res.json({ message: 'Cookie consent updated successfully' });
    } catch (error) {
      console.error('Error updating cookie consent:', error);
      res.status(500).json({ error: 'Failed to update cookie consent' });
    }
  }
);

/**
 * GET /api/privacy/breach-notifications
 * Get breach notifications for transparency
 */
router.get('/breach-notifications',
  logDataAccess('breach_notifications_access'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const notifications = await privacyComplianceService.getBreachNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching breach notifications:', error);
      res.status(500).json({ error: 'Failed to fetch breach notifications' });
    }
  }
);

/**
 * GET /api/privacy/retention-policy
 * Get data retention policy information
 */
router.get('/retention-policy',
  async (req: express.Request, res: express.Response) => {
    try {
      const policy = await privacyComplianceService.getRetentionPolicy();
      res.json(policy);
    } catch (error) {
      console.error('Error fetching retention policy:', error);
      res.status(500).json({ error: 'Failed to fetch retention policy' });
    }
  }
);

/**
 * GET /api/privacy/compliance-score
 * Get privacy compliance score
 */
router.get('/compliance-score',
  logDataAccess('compliance_score_access'),
  async (req: express.Request, res: express.Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const score = await privacyComplianceService.getComplianceScore(userId);
      res.json(score);
    } catch (error) {
      console.error('Error fetching compliance score:', error);
      res.status(500).json({ error: 'Failed to fetch compliance score' });
    }
  }
);

export default router;