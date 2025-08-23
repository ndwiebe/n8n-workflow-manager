/**
 * Backend OAuth Flow Handler
 * Secure OAuth authorization code exchange, token encryption and storage
 * Phase 2: OAuth Excellence System
 */

import crypto from 'crypto';
import fetch from 'node-fetch';
import { encryptionService } from './encryptionService';
import { auditService } from './auditService';
import { logger } from '../utils/logger';

export interface OAuthProvider {
  providerId: string;
  displayName: string;
  authUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  clientId: string;
  clientSecret: string;
  scopes: OAuthScope[];
  redirectUri: string;
  responseType: 'code' | 'token';
  grantType: 'authorization_code' | 'implicit' | 'client_credentials';
  pkce: boolean;
}

export interface OAuthScope {
  scope: string;
  displayName: string;
  description: string;
  businessPurpose: string;
  required: boolean;
  sensitive: boolean;
}

export interface OAuthToken {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn?: number;
  expiresAt?: Date;
  scope: string[];
  providerId: string;
  userId: string;
  organizationId: string;
  metadata: {
    grantedAt: Date;
    lastRefreshed?: Date;
    refreshCount: number;
    ipAddress?: string;
    userAgent?: string;
  };
}

export interface StoredOAuthToken {
  id: string;
  providerId: string;
  userId: string;
  organizationId: string;
  encryptedAccessToken: any; // EncryptedData from encryptionService
  encryptedRefreshToken?: any;
  tokenType: string;
  expiresAt?: Date;
  scope: string[];
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenExchangeRequest {
  grant_type: string;
  code: string;
  redirect_uri: string;
  client_id: string;
  client_secret?: string;
  code_verifier?: string; // For PKCE
}

export interface TokenExchangeResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  testResults: {
    testId: string;
    passed: boolean;
    result?: any;
    error?: string;
    businessMessage: string;
    executionTime: number;
  }[];
  userInfo?: {
    id: string;
    email?: string;
    name?: string;
    avatar?: string;
  };
  permissions: string[];
  connectionHealth: 'excellent' | 'good' | 'limited' | 'poor';
}

export class OAuthFlowHandler {
  private providers: Map<string, OAuthProvider> = new Map();
  private tokens: Map<string, StoredOAuthToken> = new Map(); // In production, use database
  private flowStates: Map<string, any> = new Map(); // Temporary storage for flow states

  constructor() {
    this.initializeProviders();
  }

  /**
   * Exchange authorization code for access token
   */
  public async exchangeCodeForToken(
    providerId: string,
    tokenRequest: TokenExchangeRequest,
    organizationId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; token?: OAuthToken; error?: string }> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`OAuth provider not found: ${providerId}`);
      }

      // Add client_secret for server-to-server exchange
      const exchangeRequest = {
        ...tokenRequest,
        client_secret: provider.clientSecret
      };

      // Make token exchange request
      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams(exchangeRequest)
      });

      const responseData: TokenExchangeResponse = await response.json() as TokenExchangeResponse;

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error_description || responseData.error || 'Token exchange failed');
      }

      // Create OAuth token
      const token: OAuthToken = {
        accessToken: responseData.access_token,
        refreshToken: responseData.refresh_token,
        tokenType: responseData.token_type || 'Bearer',
        expiresIn: responseData.expires_in,
        expiresAt: responseData.expires_in ? new Date(Date.now() + responseData.expires_in * 1000) : undefined,
        scope: responseData.scope ? responseData.scope.split(' ') : [],
        providerId,
        userId,
        organizationId,
        metadata: {
          grantedAt: new Date(),
          refreshCount: 0,
          ipAddress,
          userAgent
        }
      };

      // Store token securely
      await this.storeToken(token);

      // Audit successful token exchange
      await auditService.logAuditEvent({
        organizationId,
        userId,
        action: 'oauth_token_exchanged',
        resourceType: 'oauth_token',
        resourceId: `${providerId}:${userId}`,
        businessContext: {
          providerId,
          scopes: token.scope,
          expiresAt: token.expiresAt?.toISOString()
        },
        complianceRelevant: true
      });

      logger.info(`OAuth token exchanged successfully for ${providerId}:${userId}`);
      return { success: true, token };

    } catch (error) {
      logger.error(`OAuth token exchange failed for ${providerId}:`, error);
      
      // Audit failed token exchange
      await auditService.logAuditEvent({
        organizationId,
        userId,
        action: 'oauth_token_exchange_failed',
        resourceType: 'oauth_token',
        resourceId: `${providerId}:${userId}`,
        businessContext: {
          providerId,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        complianceRelevant: true
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Token exchange failed' 
      };
    }
  }

  /**
   * Refresh OAuth token
   */
  public async refreshToken(
    providerId: string,
    userId: string,
    organizationId: string
  ): Promise<{ success: boolean; token?: OAuthToken; error?: string }> {
    try {
      const storedToken = await this.getStoredToken(providerId, userId, organizationId);
      if (!storedToken || !storedToken.encryptedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`OAuth provider not found: ${providerId}`);
      }

      // Decrypt refresh token
      const refreshToken = await encryptionService.decrypt(storedToken.encryptedRefreshToken);

      // Make refresh request
      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: provider.clientId,
          client_secret: provider.clientSecret
        })
      });

      const responseData: TokenExchangeResponse = await response.json() as TokenExchangeResponse;

      if (!response.ok || responseData.error) {
        throw new Error(responseData.error_description || responseData.error || 'Token refresh failed');
      }

      // Create refreshed token
      const refreshedToken: OAuthToken = {
        accessToken: responseData.access_token,
        refreshToken: responseData.refresh_token || refreshToken, // Use new or keep existing
        tokenType: responseData.token_type || storedToken.tokenType,
        expiresIn: responseData.expires_in,
        expiresAt: responseData.expires_in ? new Date(Date.now() + responseData.expires_in * 1000) : undefined,
        scope: responseData.scope ? responseData.scope.split(' ') : storedToken.scope,
        providerId,
        userId,
        organizationId,
        metadata: {
          ...storedToken.metadata,
          lastRefreshed: new Date(),
          refreshCount: (storedToken.metadata?.refreshCount || 0) + 1
        }
      };

      // Store refreshed token
      await this.storeToken(refreshedToken);

      // Audit token refresh
      await auditService.logAuditEvent({
        organizationId,
        userId,
        action: 'oauth_token_refreshed',
        resourceType: 'oauth_token',
        resourceId: `${providerId}:${userId}`,
        businessContext: {
          providerId,
          refreshCount: refreshedToken.metadata.refreshCount,
          expiresAt: refreshedToken.expiresAt?.toISOString()
        },
        complianceRelevant: true
      });

      logger.info(`OAuth token refreshed successfully for ${providerId}:${userId}`);
      return { success: true, token: refreshedToken };

    } catch (error) {
      logger.error(`OAuth token refresh failed for ${providerId}:${userId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Token refresh failed' 
      };
    }
  }

  /**
   * Revoke OAuth token
   */
  public async revokeToken(
    providerId: string,
    userId: string,
    organizationId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const storedToken = await this.getStoredToken(providerId, userId, organizationId);
      if (!storedToken) {
        return { success: true }; // Already revoked/doesn't exist
      }

      const provider = this.providers.get(providerId);
      if (provider?.revokeUrl) {
        // Decrypt access token for revocation
        const accessToken = await encryptionService.decrypt(storedToken.encryptedAccessToken);

        // Revoke token with provider
        await fetch(provider.revokeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            token: accessToken,
            client_id: provider.clientId,
            client_secret: provider.clientSecret
          })
        });
      }

      // Remove from storage
      await this.deleteStoredToken(providerId, userId, organizationId);

      // Audit token revocation
      await auditService.logAuditEvent({
        organizationId,
        userId,
        action: 'oauth_token_revoked',
        resourceType: 'oauth_token',
        resourceId: `${providerId}:${userId}`,
        businessContext: {
          providerId
        },
        complianceRelevant: true
      });

      logger.info(`OAuth token revoked successfully for ${providerId}:${userId}`);
      return { success: true };

    } catch (error) {
      logger.error(`OAuth token revocation failed for ${providerId}:${userId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Token revocation failed' 
      };
    }
  }

  /**
   * Test OAuth connection with business-context validation
   */
  public async testConnection(
    providerId: string,
    userId: string,
    organizationId: string
  ): Promise<ConnectionTestResult> {
    try {
      const storedToken = await this.getStoredToken(providerId, userId, organizationId);
      if (!storedToken) {
        throw new Error('No OAuth token found');
      }

      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`OAuth provider not found: ${providerId}`);
      }

      // Decrypt access token
      const accessToken = await encryptionService.decrypt(storedToken.encryptedAccessToken);

      // Get test configuration for provider
      const tests = this.getConnectionTests(providerId);
      const testResults = [];
      let userInfo: any = null;

      // Execute connection tests
      for (const test of tests) {
        const startTime = Date.now();
        try {
          const response = await fetch(test.endpoint, {
            method: test.method,
            headers: {
              'Authorization': `${storedToken.tokenType} ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          const result = response.ok ? await response.json() : null;
          const executionTime = Date.now() - startTime;

          // Extract user info from profile test
          if (test.testId === 'profile' && result) {
            userInfo = this.extractUserInfo(providerId, result);
          }

          testResults.push({
            testId: test.testId,
            passed: response.ok,
            result: result,
            businessMessage: response.ok ? test.successMessage : test.failureMessage,
            executionTime
          });

        } catch (error) {
          testResults.push({
            testId: test.testId,
            passed: false,
            error: error instanceof Error ? error.message : 'Test failed',
            businessMessage: test.failureMessage,
            executionTime: Date.now() - startTime
          });
        }
      }

      // Calculate connection health
      const passedTests = testResults.filter(t => t.passed).length;
      const totalTests = testResults.length;
      const successRate = passedTests / totalTests;

      let connectionHealth: ConnectionTestResult['connectionHealth'];
      if (successRate === 1) connectionHealth = 'excellent';
      else if (successRate >= 0.8) connectionHealth = 'good';
      else if (successRate >= 0.6) connectionHealth = 'limited';
      else connectionHealth = 'poor';

      // Map scopes to business permissions
      const permissions = this.mapScopesToPermissions(storedToken.scope, provider);

      const result: ConnectionTestResult = {
        success: passedTests > 0,
        testResults,
        userInfo,
        permissions,
        connectionHealth
      };

      // Audit connection test
      await auditService.logAuditEvent({
        organizationId,
        userId,
        action: 'oauth_connection_tested',
        resourceType: 'oauth_token',
        resourceId: `${providerId}:${userId}`,
        businessContext: {
          providerId,
          testsRun: totalTests,
          testsPassed: passedTests,
          connectionHealth,
          permissions
        },
        complianceRelevant: false
      });

      return result;

    } catch (error) {
      logger.error(`OAuth connection test failed for ${providerId}:${userId}:`, error);
      
      return {
        success: false,
        testResults: [{
          testId: 'connection',
          passed: false,
          error: error instanceof Error ? error.message : 'Connection test failed',
          businessMessage: 'Unable to connect to the service. Please check your authorization.',
          executionTime: 0
        }],
        permissions: [],
        connectionHealth: 'poor'
      };
    }
  }

  /**
   * Get OAuth token for API calls
   */
  public async getToken(
    providerId: string,
    userId: string,
    organizationId: string
  ): Promise<{ success: boolean; token?: OAuthToken; error?: string }> {
    try {
      const storedToken = await this.getStoredToken(providerId, userId, organizationId);
      if (!storedToken) {
        return { success: false, error: 'No OAuth token found' };
      }

      // Check if token needs refresh
      if (storedToken.expiresAt && storedToken.expiresAt <= new Date()) {
        logger.info(`Token expired for ${providerId}:${userId}, attempting refresh`);
        return await this.refreshToken(providerId, userId, organizationId);
      }

      // Decrypt and return token
      const accessToken = await encryptionService.decrypt(storedToken.encryptedAccessToken);
      const refreshToken = storedToken.encryptedRefreshToken 
        ? await encryptionService.decrypt(storedToken.encryptedRefreshToken)
        : undefined;

      const token: OAuthToken = {
        accessToken,
        refreshToken,
        tokenType: storedToken.tokenType,
        expiresAt: storedToken.expiresAt,
        scope: storedToken.scope,
        providerId: storedToken.providerId,
        userId: storedToken.userId,
        organizationId: storedToken.organizationId,
        metadata: storedToken.metadata
      };

      return { success: true, token };

    } catch (error) {
      logger.error(`Failed to get OAuth token for ${providerId}:${userId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to retrieve token' 
      };
    }
  }

  /**
   * Private Methods
   */

  private async storeToken(token: OAuthToken): Promise<void> {
    try {
      // Encrypt sensitive token data
      const encryptedAccessToken = await encryptionService.encrypt(
        token.accessToken,
        token.organizationId,
        'credentials',
        'oauth_access_token'
      );

      const encryptedRefreshToken = token.refreshToken
        ? await encryptionService.encrypt(
            token.refreshToken,
            token.organizationId,
            'credentials',
            'oauth_refresh_token'
          )
        : undefined;

      const storedToken: StoredOAuthToken = {
        id: `${token.providerId}:${token.userId}:${token.organizationId}`,
        providerId: token.providerId,
        userId: token.userId,
        organizationId: token.organizationId,
        encryptedAccessToken,
        encryptedRefreshToken,
        tokenType: token.tokenType,
        expiresAt: token.expiresAt,
        scope: token.scope,
        metadata: token.metadata,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store in memory (in production, use database)
      this.tokens.set(storedToken.id, storedToken);

    } catch (error) {
      logger.error('Failed to store OAuth token:', error);
      throw new Error('Failed to store OAuth token securely');
    }
  }

  private async getStoredToken(
    providerId: string,
    userId: string,
    organizationId: string
  ): Promise<StoredOAuthToken | null> {
    const tokenId = `${providerId}:${userId}:${organizationId}`;
    return this.tokens.get(tokenId) || null;
  }

  private async deleteStoredToken(
    providerId: string,
    userId: string,
    organizationId: string
  ): Promise<void> {
    const tokenId = `${providerId}:${userId}:${organizationId}`;
    this.tokens.delete(tokenId);
  }

  private initializeProviders(): void {
    // Gmail/Google
    this.providers.set('gmail', {
      providerId: 'gmail',
      displayName: 'Gmail',
      authUrl: 'https://accounts.google.com/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      revokeUrl: 'https://oauth2.googleapis.com/revoke',
      clientId: process.env.GOOGLE_CLIENT_ID || 'your-gmail-client-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-gmail-client-secret',
      scopes: [
        { scope: 'email', displayName: 'Email Address', description: 'View your email address', businessPurpose: 'Identify your Gmail account', required: true, sensitive: false },
        { scope: 'https://www.googleapis.com/auth/gmail.readonly', displayName: 'Read Gmail', description: 'Read your email messages', businessPurpose: 'Process and analyze your emails', required: true, sensitive: true },
        { scope: 'https://www.googleapis.com/auth/gmail.send', displayName: 'Send Gmail', description: 'Send emails on your behalf', businessPurpose: 'Send automated emails and notifications', required: false, sensitive: true }
      ],
      redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
      responseType: 'code',
      grantType: 'authorization_code',
      pkce: true
    });

    // Slack
    this.providers.set('slack', {
      providerId: 'slack',
      displayName: 'Slack',
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      clientId: process.env.SLACK_CLIENT_ID || 'your-slack-client-id',
      clientSecret: process.env.SLACK_CLIENT_SECRET || 'your-slack-client-secret',
      scopes: [
        { scope: 'channels:read', displayName: 'Read Channels', description: 'View public channels', businessPurpose: 'Access your Slack channels for notifications', required: true, sensitive: false },
        { scope: 'chat:write', displayName: 'Send Messages', description: 'Send messages to channels', businessPurpose: 'Send automated notifications and updates', required: true, sensitive: false },
        { scope: 'users:read', displayName: 'Read Users', description: 'View user information', businessPurpose: 'Identify team members for notifications', required: false, sensitive: false }
      ],
      redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
      responseType: 'code',
      grantType: 'authorization_code',
      pkce: false
    });

    // Microsoft Office 365
    this.providers.set('office365', {
      providerId: 'office365',
      displayName: 'Microsoft 365',
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientId: process.env.MICROSOFT_CLIENT_ID || 'your-microsoft-client-id',
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET || 'your-microsoft-client-secret',
      scopes: [
        { scope: 'User.Read', displayName: 'Read Profile', description: 'Read your profile information', businessPurpose: 'Identify your Microsoft account', required: true, sensitive: false },
        { scope: 'Mail.Read', displayName: 'Read Email', description: 'Read your email messages', businessPurpose: 'Process and analyze your Outlook emails', required: false, sensitive: true },
        { scope: 'Mail.Send', displayName: 'Send Email', description: 'Send emails on your behalf', businessPurpose: 'Send automated emails through Outlook', required: false, sensitive: true },
        { scope: 'Files.ReadWrite', displayName: 'OneDrive Access', description: 'Read and write your OneDrive files', businessPurpose: 'Store and retrieve business documents', required: false, sensitive: true }
      ],
      redirectUri: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/oauth/callback',
      responseType: 'code',
      grantType: 'authorization_code',
      pkce: true
    });
  }

  private getConnectionTests(providerId: string) {
    const testConfigs: Record<string, any[]> = {
      gmail: [
        {
          testId: 'profile',
          endpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
          method: 'GET',
          successMessage: 'Successfully connected to your Google account',
          failureMessage: 'Unable to access your Google profile information'
        },
        {
          testId: 'gmail_access',
          endpoint: 'https://gmail.googleapis.com/gmail/v1/users/me/profile',
          method: 'GET',
          successMessage: 'Successfully connected to Gmail',
          failureMessage: 'Unable to access Gmail. Check permissions.'
        }
      ],
      slack: [
        {
          testId: 'profile',
          endpoint: 'https://slack.com/api/auth.test',
          method: 'GET',
          successMessage: 'Successfully connected to your Slack workspace',
          failureMessage: 'Unable to access your Slack workspace'
        },
        {
          testId: 'channels',
          endpoint: 'https://slack.com/api/conversations.list',
          method: 'GET',
          successMessage: 'Successfully accessed Slack channels',
          failureMessage: 'Unable to access Slack channels. Check permissions.'
        }
      ],
      office365: [
        {
          testId: 'profile',
          endpoint: 'https://graph.microsoft.com/v1.0/me',
          method: 'GET',
          successMessage: 'Successfully connected to your Microsoft 365 account',
          failureMessage: 'Unable to access your Microsoft 365 profile'
        }
      ]
    };

    return testConfigs[providerId] || [];
  }

  private extractUserInfo(providerId: string, data: any) {
    switch (providerId) {
      case 'gmail':
        return {
          id: data.id,
          email: data.email,
          name: data.name,
          avatar: data.picture
        };
      case 'slack':
        return {
          id: data.user_id,
          name: data.user,
          avatar: data.team?.icon?.image_68
        };
      case 'office365':
        return {
          id: data.id,
          email: data.userPrincipalName,
          name: data.displayName,
          avatar: data.photo
        };
      default:
        return null;
    }
  }

  private mapScopesToPermissions(scopes: string[], provider: OAuthProvider): string[] {
    return scopes.map(scope => {
      const scopeConfig = provider.scopes.find(s => s.scope === scope);
      return scopeConfig?.displayName || scope;
    });
  }
}

// Export singleton instance
export const oauthFlowHandler = new OAuthFlowHandler();