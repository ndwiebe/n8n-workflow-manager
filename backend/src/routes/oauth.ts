/**
 * OAuth API Routes
 * Backend endpoints for OAuth flow management
 * Phase 2: OAuth Excellence System
 */

import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { oauthFlowHandler } from '../services/oauthFlowHandler';
import { logger } from '../utils/logger';

const router = express.Router();

/**
 * Exchange OAuth authorization code for access token
 */
router.post('/token', 
  authenticateToken,
  [
    body('providerId').notEmpty().withMessage('Provider ID is required'),
    body('tokenRequest').isObject().withMessage('Token request data is required'),
    body('tokenRequest.grant_type').equals('authorization_code').withMessage('Invalid grant type'),
    body('tokenRequest.code').notEmpty().withMessage('Authorization code is required'),
    body('tokenRequest.redirect_uri').isURL().withMessage('Valid redirect URI is required'),
    body('tokenRequest.client_id').notEmpty().withMessage('Client ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          }
        });
      }

      const { providerId, tokenRequest } = req.body;
      const { userId, organizationId } = req.user;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');

      const result = await oauthFlowHandler.exchangeCodeForToken(
        providerId,
        tokenRequest,
        organizationId,
        userId,
        ipAddress,
        userAgent
      );

      if (result.success) {
        res.json({
          success: true,
          data: {
            access_token: result.token?.accessToken,
            refresh_token: result.token?.refreshToken,
            token_type: result.token?.tokenType,
            expires_in: result.token?.expiresIn,
            scope: result.token?.scope?.join(' ')
          },
          metadata: {
            providerId,
            expiresAt: result.token?.expiresAt?.toISOString(),
            scopes: result.token?.scope
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'TOKEN_EXCHANGE_FAILED',
            message: result.error || 'Failed to exchange authorization code',
            userMessage: 'Authorization failed. Please try connecting again.'
          }
        });
      }

    } catch (error) {
      logger.error('OAuth token exchange error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error during token exchange',
          userMessage: 'Something went wrong. Please try again.'
        }
      });
    }
  }
);

/**
 * Refresh OAuth token
 */
router.post('/token/refresh/:providerId',
  authenticateToken,
  [
    param('providerId').notEmpty().withMessage('Provider ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          }
        });
      }

      const { providerId } = req.params;
      const { userId, organizationId } = req.user;

      const result = await oauthFlowHandler.refreshToken(providerId, userId, organizationId);

      if (result.success) {
        res.json({
          success: true,
          data: {
            access_token: result.token?.accessToken,
            refresh_token: result.token?.refreshToken,
            token_type: result.token?.tokenType,
            expires_in: result.token?.expiresIn,
            scope: result.token?.scope?.join(' ')
          },
          metadata: {
            providerId,
            expiresAt: result.token?.expiresAt?.toISOString(),
            refreshCount: result.token?.metadata.refreshCount,
            lastRefreshed: result.token?.metadata.lastRefreshed?.toISOString()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'TOKEN_REFRESH_FAILED',
            message: result.error || 'Failed to refresh token',
            userMessage: 'Unable to refresh access token. You may need to reconnect.'
          }
        });
      }

    } catch (error) {
      logger.error('OAuth token refresh error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error during token refresh',
          userMessage: 'Something went wrong. Please try again.'
        }
      });
    }
  }
);

/**
 * Revoke OAuth token
 */
router.delete('/token/:providerId',
  authenticateToken,
  [
    param('providerId').notEmpty().withMessage('Provider ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          }
        });
      }

      const { providerId } = req.params;
      const { userId, organizationId } = req.user;

      const result = await oauthFlowHandler.revokeToken(providerId, userId, organizationId);

      if (result.success) {
        res.json({
          success: true,
          message: `Successfully revoked ${providerId} token`,
          metadata: {
            providerId,
            revokedAt: new Date().toISOString()
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'TOKEN_REVOCATION_FAILED',
            message: result.error || 'Failed to revoke token',
            userMessage: 'Unable to revoke access token.'
          }
        });
      }

    } catch (error) {
      logger.error('OAuth token revocation error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error during token revocation',
          userMessage: 'Something went wrong. Please try again.'
        }
      });
    }
  }
);

/**
 * Test OAuth connection
 */
router.post('/test/:providerId',
  authenticateToken,
  [
    param('providerId').notEmpty().withMessage('Provider ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          }
        });
      }

      const { providerId } = req.params;
      const { userId, organizationId } = req.user;

      const result = await oauthFlowHandler.testConnection(providerId, userId, organizationId);

      res.json({
        success: result.success,
        data: {
          connectionHealth: result.connectionHealth,
          testResults: result.testResults,
          userInfo: result.userInfo,
          permissions: result.permissions,
          summary: {
            totalTests: result.testResults.length,
            passedTests: result.testResults.filter(t => t.passed).length,
            avgExecutionTime: result.testResults.reduce((sum, t) => sum + t.executionTime, 0) / result.testResults.length
          }
        },
        metadata: {
          providerId,
          testedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('OAuth connection test error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error during connection test',
          userMessage: 'Unable to test connection. Please try again.'
        }
      });
    }
  }
);

/**
 * Get OAuth token status
 */
router.get('/status/:providerId',
  authenticateToken,
  [
    param('providerId').notEmpty().withMessage('Provider ID is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request parameters',
            details: errors.array()
          }
        });
      }

      const { providerId } = req.params;
      const { userId, organizationId } = req.user;

      const tokenResult = await oauthFlowHandler.getToken(providerId, userId, organizationId);

      if (tokenResult.success && tokenResult.token) {
        const token = tokenResult.token;
        const now = new Date();
        const isExpired = token.expiresAt ? token.expiresAt <= now : false;
        const isExpiringSoon = token.expiresAt ? (token.expiresAt.getTime() - now.getTime()) < 300000 : false; // 5 minutes

        res.json({
          success: true,
          data: {
            providerId: token.providerId,
            isConnected: true,
            isExpired,
            isExpiringSoon,
            expiresAt: token.expiresAt?.toISOString(),
            scopes: token.scope,
            tokenType: token.tokenType,
            metadata: {
              grantedAt: token.metadata.grantedAt.toISOString(),
              lastRefreshed: token.metadata.lastRefreshed?.toISOString(),
              refreshCount: token.metadata.refreshCount
            }
          }
        });
      } else {
        res.json({
          success: true,
          data: {
            providerId,
            isConnected: false,
            isExpired: true,
            scopes: [],
            tokenType: null
          }
        });
      }

    } catch (error) {
      logger.error('OAuth status check error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error during status check',
          userMessage: 'Unable to check connection status. Please try again.'
        }
      });
    }
  }
);

/**
 * Get available OAuth providers
 */
router.get('/providers', async (req, res) => {
  try {
    // Return public provider information (no client secrets)
    const providers = [
      {
        providerId: 'gmail',
        displayName: 'Gmail',
        category: 'email_marketing',
        businessDescription: 'Connect your Gmail account to send and receive emails automatically',
        setupComplexity: 'simple',
        estimatedSetupTime: '2 minutes',
        supportedFeatures: ['Send emails', 'Read inbox', 'Email automation', 'Contact management'],
        scopes: [
          { scope: 'email', displayName: 'Email Address', businessPurpose: 'Identify your Gmail account', required: true, sensitive: false },
          { scope: 'https://www.googleapis.com/auth/gmail.readonly', displayName: 'Read Gmail', businessPurpose: 'Process and analyze your emails', required: true, sensitive: true },
          { scope: 'https://www.googleapis.com/auth/gmail.send', displayName: 'Send Gmail', businessPurpose: 'Send automated emails and notifications', required: false, sensitive: true }
        ]
      },
      {
        providerId: 'slack',
        displayName: 'Slack',
        category: 'communication',
        businessDescription: 'Connect your Slack workspace to send automated messages and notifications',
        setupComplexity: 'simple',
        estimatedSetupTime: '2 minutes',
        supportedFeatures: ['Send messages', 'Channel notifications', 'Team communication', 'Bot integration'],
        scopes: [
          { scope: 'channels:read', displayName: 'Read Channels', businessPurpose: 'Access your Slack channels for notifications', required: true, sensitive: false },
          { scope: 'chat:write', displayName: 'Send Messages', businessPurpose: 'Send automated notifications and updates', required: true, sensitive: false },
          { scope: 'users:read', displayName: 'Read Users', businessPurpose: 'Identify team members for notifications', required: false, sensitive: false }
        ]
      },
      {
        providerId: 'office365',
        displayName: 'Microsoft 365',
        category: 'email_marketing',
        businessDescription: 'Connect your Microsoft 365 account for email and document automation',
        setupComplexity: 'moderate',
        estimatedSetupTime: '3 minutes',
        supportedFeatures: ['Outlook email', 'OneDrive storage', 'Teams integration', 'Calendar access'],
        scopes: [
          { scope: 'User.Read', displayName: 'Read Profile', businessPurpose: 'Identify your Microsoft account', required: true, sensitive: false },
          { scope: 'Mail.Read', displayName: 'Read Email', businessPurpose: 'Process and analyze your Outlook emails', required: false, sensitive: true },
          { scope: 'Mail.Send', displayName: 'Send Email', businessPurpose: 'Send automated emails through Outlook', required: false, sensitive: true },
          { scope: 'Files.ReadWrite', displayName: 'OneDrive Access', businessPurpose: 'Store and retrieve business documents', required: false, sensitive: true }
        ]
      }
    ];

    res.json({
      success: true,
      data: {
        providers,
        total: providers.length
      }
    });

  } catch (error) {
    logger.error('Error fetching OAuth providers:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error fetching providers',
        userMessage: 'Unable to load available services. Please try again.'
      }
    });
  }
});

/**
 * OAuth callback endpoint (for popup windows)
 */
router.get('/callback', (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    // Send message to parent window (popup opener)
    const callbackScript = `
      <script>
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_CALLBACK',
            code: '${code || ''}',
            state: '${state || ''}',
            error: '${error || ''}',
            error_description: '${error_description || ''}'
          }, window.location.origin);
          window.close();
        } else {
          document.body.innerHTML = '<h2>Authorization ${error ? 'Failed' : 'Successful'}</h2><p>Please close this window.</p>';
        }
      </script>
    `;

    res.send(callbackScript);

  } catch (error) {
    logger.error('OAuth callback error:', error);
    res.status(500).send(`
      <script>
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_CALLBACK',
            error: 'callback_error',
            error_description: 'OAuth callback processing failed'
          }, window.location.origin);
          window.close();
        } else {
          document.body.innerHTML = '<h2>Authorization Failed</h2><p>Please close this window and try again.</p>';
        }
      </script>
    `);
  }
});

export default router;