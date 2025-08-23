/**
 * OAuth Flow Manager
 * Handles secure OAuth popup windows, authorization code exchange, and token management
 * Phase 2: OAuth Excellence System
 */

import { 
  OAuthProvider, 
  OAuthToken, 
  OAuthFlowState, 
  OAuthConnectionResult, 
  OAuthEventType, 
  OAuthEvent,
  OAuthFlowConfig,
  OAuthProviderConfig,
  SmartCredentialResponse,
  ServiceCategory
} from '../types/smartCredentials';
// Note: Encryption should be handled by backend API calls
// import { encryptionService } from './n8nService';

// Temporary mock for missing encryption service
const encryptionService = {
  encrypt: (data: any) => Promise.resolve(btoa(JSON.stringify(data))),
  decrypt: (data: string) => Promise.resolve(JSON.parse(atob(data)))
};

export class OAuthFlowManager {
  private flowStates: Map<string, OAuthFlowState> = new Map();
  private eventListeners: Map<OAuthEventType, Array<(event: OAuthEvent) => void>> = new Map();
  private popupWindows: Map<string, Window> = new Map();
  private providers: Map<string, OAuthProvider> = new Map();
  
  private config: OAuthFlowConfig = {
    popupWindow: {
      width: 600,
      height: 700,
      centerOnScreen: true,
      features: ['scrollbars=yes', 'resizable=yes', 'status=no', 'location=no', 'toolbar=no', 'menubar=no']
    },
    timeout: {
      authorizationTimeout: 300000, // 5 minutes
      tokenExchangeTimeout: 30000,  // 30 seconds
      testTimeout: 15000           // 15 seconds
    },
    security: {
      validateState: true,
      validateNonce: true,
      requirePKCE: true,
      allowedOrigins: ['http://localhost:3000', 'https://localhost:3000']
    },
    ui: {
      showProgress: true,
      autoCloseOnSuccess: true,
      redirectOnError: false,
      customMessages: {}
    }
  };

  constructor() {
    this.initializeEventListeners();
    this.initializeProviders();
    this.setupMessageListener();
  }

  /**
   * Start OAuth authorization flow with popup window
   */
  public async startOAuthFlow(
    workflowId: string,
    serviceId: string,
    providerId: string,
    userId: string,
    customScopes?: string[]
  ): Promise<SmartCredentialResponse<OAuthConnectionResult>> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`OAuth provider not found: ${providerId}`);
      }

      // Generate secure state and PKCE parameters
      const state = this.generateSecureState();
      const codeVerifier = provider.pkce ? this.generateCodeVerifier() : undefined;
      const codeChallenge = codeVerifier ? await this.generateCodeChallenge(codeVerifier) : undefined;

      // Create flow state
      const flowState: OAuthFlowState = {
        state,
        providerId,
        workflowId,
        serviceId,
        redirectUri: provider.redirectUri,
        scopes: customScopes || provider.scopes.filter(s => s.required).map(s => s.scope),
        codeVerifier,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + this.config.timeout.authorizationTimeout),
        userId,
        metadata: {
          userAgent: navigator.userAgent,
          origin: window.location.origin
        }
      };

      // Store flow state
      this.flowStates.set(state, flowState);

      // Build authorization URL
      const authUrl = this.buildAuthorizationUrl(provider, flowState, codeChallenge);

      // Open popup window
      const popup = this.openAuthorizationPopup(authUrl, state);
      if (!popup) {
        throw new Error('Failed to open authorization popup. Please check popup blocker settings.');
      }

      this.popupWindows.set(state, popup);

      // Emit event
      await this.emitEvent({
        type: OAuthEventType.AUTHORIZATION_STARTED,
        timestamp: new Date(),
        workflowId,
        serviceId,
        data: {},
        userId,
        oauthData: {
          providerId,
          scopes: flowState.scopes
        }
      });

      // Wait for authorization completion
      const result = await this.waitForAuthorizationComplete(state);

      return {
        success: result.success,
        data: result,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          processingTime: Date.now() - flowState.createdAt.getTime(),
          version: '2.0'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OAUTH_FLOW_FAILED',
          message: error instanceof Error ? error.message : 'OAuth flow failed',
          userMessage: 'Failed to connect to the service. Please try again.',
          resolution: 'Check your popup blocker settings and ensure the service is accessible.'
        }
      };
    }
  }

  /**
   * Handle OAuth callback (called by popup window)
   */
  public async handleOAuthCallback(
    code: string,
    state: string,
    error?: string,
    errorDescription?: string
  ): Promise<OAuthConnectionResult> {
    try {
      // Validate state
      const flowState = this.flowStates.get(state);
      if (!flowState) {
        throw new Error('Invalid or expired OAuth state');
      }

      // Check for authorization errors
      if (error) {
        throw new Error(errorDescription || error);
      }

      // Exchange code for token
      const tokenResult = await this.exchangeCodeForToken(code, flowState);
      if (!tokenResult.success || !tokenResult.data) {
        throw new Error('Failed to exchange authorization code for access token');
      }

      const token = tokenResult.data;
      const provider = this.providers.get(flowState.providerId);
      if (!provider) {
        throw new Error('Provider configuration not found');
      }

      // Get user info
      const userInfo = await this.getUserInfo(token, provider);

      // Create connection result
      const connectionResult: OAuthConnectionResult = {
        success: true,
        token,
        providerInfo: {
          providerId: flowState.providerId,
          displayName: provider.displayName,
          userInfo
        },
        connectionDetails: {
          scopes: token.scope,
          permissions: this.mapScopesToPermissions(token.scope, provider),
          connectedAt: new Date(),
          expiresAt: token.expiresAt
        }
      };

      // Clean up
      this.cleanupFlowState(state);

      // Emit success event
      await this.emitEvent({
        type: OAuthEventType.AUTHORIZATION_SUCCESS,
        timestamp: new Date(),
        workflowId: flowState.workflowId,
        serviceId: flowState.serviceId,
        data: {},
        userId: flowState.userId,
        oauthData: {
          providerId: flowState.providerId,
          scopes: token.scope,
          tokenInfo: {
            expiresAt: token.expiresAt,
            scope: token.scope
          }
        }
      });

      return connectionResult;

    } catch (error) {
      const flowState = this.flowStates.get(state);
      
      // Clean up on error
      this.cleanupFlowState(state);

      // Emit error event
      if (flowState) {
        await this.emitEvent({
          type: OAuthEventType.AUTHORIZATION_FAILED,
          timestamp: new Date(),
          workflowId: flowState.workflowId,
          serviceId: flowState.serviceId,
          data: {},
          userId: flowState.userId,
          oauthData: {
            providerId: flowState.providerId,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
      }

      return {
        success: false,
        error: {
          code: 'OAUTH_CALLBACK_FAILED',
          message: error instanceof Error ? error.message : 'OAuth callback failed',
          userMessage: 'Authorization failed. Please try connecting again.',
          retryable: true
        },
        providerInfo: {
          providerId: flowState?.providerId || 'unknown',
          displayName: flowState ? (this.providers.get(flowState.providerId)?.displayName || 'Unknown') : 'Unknown'
        },
        connectionDetails: {
          scopes: [],
          permissions: [],
          connectedAt: new Date()
        }
      };
    }
  }

  /**
   * Refresh OAuth token
   */
  public async refreshToken(
    token: OAuthToken,
    providerId: string
  ): Promise<SmartCredentialResponse<OAuthToken>> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider) {
        throw new Error(`OAuth provider not found: ${providerId}`);
      }

      if (!token.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(provider.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken,
          client_id: provider.clientId
        })
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokenData = await response.json();

      const refreshedToken: OAuthToken = {
        ...token,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || token.refreshToken,
        expiresIn: tokenData.expires_in,
        expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
        scope: tokenData.scope ? tokenData.scope.split(' ') : token.scope,
        metadata: {
          ...token.metadata,
          lastRefreshed: new Date(),
          refreshCount: token.metadata.refreshCount + 1
        }
      };

      // Emit refresh event
      await this.emitEvent({
        type: OAuthEventType.TOKEN_REFRESHED,
        timestamp: new Date(),
        workflowId: 'system',
        data: {},
        userId: token.userId || 'system',
        oauthData: {
          providerId,
          tokenInfo: {
            expiresAt: refreshedToken.expiresAt,
            scope: refreshedToken.scope
          }
        }
      });

      return {
        success: true,
        data: refreshedToken,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          processingTime: 0,
          version: '2.0'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: error instanceof Error ? error.message : 'Token refresh failed',
          userMessage: 'Failed to refresh access token. You may need to reconnect.',
          resolution: 'Try disconnecting and reconnecting your account.'
        }
      };
    }
  }

  /**
   * Revoke OAuth token
   */
  public async revokeToken(
    token: OAuthToken,
    providerId: string
  ): Promise<SmartCredentialResponse<boolean>> {
    try {
      const provider = this.providers.get(providerId);
      if (!provider || !provider.revokeUrl) {
        return { success: true, data: true }; // No revoke endpoint, consider it successful
      }

      const response = await fetch(provider.revokeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          token: token.accessToken,
          client_id: provider.clientId
        })
      });

      return {
        success: response.ok,
        data: response.ok,
        metadata: {
          requestId: this.generateRequestId(),
          timestamp: new Date(),
          processingTime: 0,
          version: '2.0'
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TOKEN_REVOCATION_FAILED',
          message: error instanceof Error ? error.message : 'Token revocation failed',
          userMessage: 'Failed to revoke access token.',
          resolution: 'The token may still be active. Contact support if needed.'
        }
      };
    }
  }

  /**
   * Get available OAuth providers
   */
  public getAvailableProviders(): OAuthProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get specific OAuth provider
   */
  public getProvider(providerId: string): OAuthProvider | null {
    return this.providers.get(providerId) || null;
  }

  /**
   * Add or update OAuth provider
   */
  public setProvider(providerId: string, provider: OAuthProvider): void {
    this.providers.set(providerId, provider);
    
    this.emitEvent({
      type: OAuthEventType.PROVIDER_CONFIGURED,
      timestamp: new Date(),
      workflowId: 'system',
      data: {},
      userId: 'system',
      oauthData: {
        providerId
      }
    });
  }

  /**
   * Subscribe to OAuth events
   */
  public addEventListener(
    eventType: OAuthEventType,
    listener: (event: OAuthEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(listener);
    this.eventListeners.set(eventType, listeners);
  }

  /**
   * Unsubscribe from OAuth events
   */
  public removeEventListener(
    eventType: OAuthEventType,
    listener: (event: OAuthEvent) => void
  ): void {
    const listeners = this.eventListeners.get(eventType) || [];
    const index = listeners.indexOf(listener);
    if (index > -1) {
      listeners.splice(index, 1);
      this.eventListeners.set(eventType, listeners);
    }
  }

  /**
   * Private Methods
   */

  private initializeEventListeners(): void {
    Object.values(OAuthEventType).forEach(eventType => {
      this.eventListeners.set(eventType, []);
    });
  }

  private initializeProviders(): void {
    // Initialize major OAuth providers with configurations
    const baseUrl = window.location.origin;
    
    // Gmail/Google
    this.providers.set('gmail', {
      providerId: 'gmail',
      displayName: 'Gmail',
      authUrl: 'https://accounts.google.com/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      revokeUrl: 'https://oauth2.googleapis.com/revoke',
      clientId: process.env.REACT_APP_GOOGLE_CLIENT_ID || 'your-gmail-client-id',
      scopes: [
        { scope: 'email', displayName: 'Email Address', description: 'View your email address', businessPurpose: 'Identify your Gmail account', required: true, sensitive: false },
        { scope: 'https://www.googleapis.com/auth/gmail.readonly', displayName: 'Read Gmail', description: 'Read your email messages', businessPurpose: 'Process and analyze your emails', required: true, sensitive: true },
        { scope: 'https://www.googleapis.com/auth/gmail.send', displayName: 'Send Gmail', description: 'Send emails on your behalf', businessPurpose: 'Send automated emails and notifications', required: false, sensitive: true }
      ],
      redirectUri: `${baseUrl}/oauth/callback`,
      responseType: 'code',
      grantType: 'authorization_code',
      pkce: true,
      metadata: {
        icon: 'MailIcon',
        category: ServiceCategory.EMAIL_MARKETING,
        businessDescription: 'Connect your Gmail account to send and receive emails automatically',
        setupComplexity: 'simple',
        estimatedSetupTime: '2 minutes',
        supportedFeatures: ['Send emails', 'Read inbox', 'Email automation', 'Contact management']
      }
    });

    // Slack
    this.providers.set('slack', {
      providerId: 'slack',
      displayName: 'Slack',
      authUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      clientId: process.env.REACT_APP_SLACK_CLIENT_ID || 'your-slack-client-id',
      scopes: [
        { scope: 'channels:read', displayName: 'Read Channels', description: 'View public channels', businessPurpose: 'Access your Slack channels for notifications', required: true, sensitive: false },
        { scope: 'chat:write', displayName: 'Send Messages', description: 'Send messages to channels', businessPurpose: 'Send automated notifications and updates', required: true, sensitive: false },
        { scope: 'users:read', displayName: 'Read Users', description: 'View user information', businessPurpose: 'Identify team members for notifications', required: false, sensitive: false }
      ],
      redirectUri: `${baseUrl}/oauth/callback`,
      responseType: 'code',
      grantType: 'authorization_code',
      pkce: false,
      metadata: {
        icon: 'ChatIcon',
        category: ServiceCategory.COMMUNICATION,
        businessDescription: 'Connect your Slack workspace to send automated messages and notifications',
        setupComplexity: 'simple',
        estimatedSetupTime: '2 minutes',
        supportedFeatures: ['Send messages', 'Channel notifications', 'Team communication', 'Bot integration']
      }
    });

    // Microsoft Office 365
    this.providers.set('office365', {
      providerId: 'office365',
      displayName: 'Microsoft 365',
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      clientId: process.env.REACT_APP_MICROSOFT_CLIENT_ID || 'your-microsoft-client-id',
      scopes: [
        { scope: 'User.Read', displayName: 'Read Profile', description: 'Read your profile information', businessPurpose: 'Identify your Microsoft account', required: true, sensitive: false },
        { scope: 'Mail.Read', displayName: 'Read Email', description: 'Read your email messages', businessPurpose: 'Process and analyze your Outlook emails', required: false, sensitive: true },
        { scope: 'Mail.Send', displayName: 'Send Email', description: 'Send emails on your behalf', businessPurpose: 'Send automated emails through Outlook', required: false, sensitive: true },
        { scope: 'Files.ReadWrite', displayName: 'OneDrive Access', description: 'Read and write your OneDrive files', businessPurpose: 'Store and retrieve business documents', required: false, sensitive: true }
      ],
      redirectUri: `${baseUrl}/oauth/callback`,
      responseType: 'code',
      grantType: 'authorization_code',
      pkce: true,
      metadata: {
        icon: 'BusinessIcon',
        category: ServiceCategory.EMAIL_MARKETING,
        businessDescription: 'Connect your Microsoft 365 account for email and document automation',
        setupComplexity: 'moderate',
        estimatedSetupTime: '3 minutes',
        supportedFeatures: ['Outlook email', 'OneDrive storage', 'Teams integration', 'Calendar access']
      }
    });
  }

  private setupMessageListener(): void {
    window.addEventListener('message', (event) => {
      if (!this.config.security.allowedOrigins.includes(event.origin)) {
        return;
      }

      if (event.data.type === 'OAUTH_CALLBACK') {
        const { code, state, error, error_description } = event.data;
        this.handleOAuthCallback(code, state, error, error_description);
      }
    }, false);
  }

  private generateSecureState(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const buffer = await crypto.subtle.digest('SHA-256', data);
    const array = new Uint8Array(buffer);
    return btoa(String.fromCharCode.apply(null, Array.from(array)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  private buildAuthorizationUrl(
    provider: OAuthProvider,
    flowState: OAuthFlowState,
    codeChallenge?: string | Promise<string>
  ): string {
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      response_type: provider.responseType,
      scope: flowState.scopes.join(' '),
      state: flowState.state
    });

    if (provider.pkce && codeChallenge) {
      params.append('code_challenge', typeof codeChallenge === 'string' ? codeChallenge : '');
      params.append('code_challenge_method', 'S256');
    }

    return `${provider.authUrl}?${params.toString()}`;
  }

  private openAuthorizationPopup(url: string, state: string): Window | null {
    const { width, height, centerOnScreen, features } = this.config.popupWindow;
    
    let left = 0;
    let top = 0;
    
    if (centerOnScreen) {
      left = (window.screen.width - width) / 2;
      top = (window.screen.height - height) / 2;
    }

    const windowFeatures = [
      ...features,
      `width=${width}`,
      `height=${height}`,
      `left=${left}`,
      `top=${top}`
    ].join(',');

    return window.open(url, `oauth_${state}`, windowFeatures);
  }

  private async waitForAuthorizationComplete(state: string): Promise<OAuthConnectionResult> {
    return new Promise((resolve, reject) => {
      const popup = this.popupWindows.get(state);
      const timeout = setTimeout(() => {
        this.cleanupFlowState(state);
        reject(new Error('Authorization timeout'));
      }, this.config.timeout.authorizationTimeout);

      // Monitor popup window
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          clearTimeout(timeout);
          this.cleanupFlowState(state);
          reject(new Error('Authorization popup was closed by user'));
        }
      }, 1000);

      // Set up one-time listener for completion
      const handleCompletion = (result: OAuthConnectionResult) => {
        clearInterval(checkClosed);
        clearTimeout(timeout);
        resolve(result);
      };

      // Store completion handler temporarily
      (this as any)[`completion_${state}`] = handleCompletion;
    });
  }

  private async exchangeCodeForToken(
    code: string,
    flowState: OAuthFlowState
  ): Promise<SmartCredentialResponse<OAuthToken>> {
    try {
      const provider = this.providers.get(flowState.providerId);
      if (!provider) {
        throw new Error('Provider not found');
      }

      const tokenRequest = {
        grant_type: 'authorization_code',
        code,
        redirect_uri: provider.redirectUri,
        client_id: provider.clientId
      };

      if (flowState.codeVerifier) {
        (tokenRequest as any).code_verifier = flowState.codeVerifier;
      }

      const response = await fetch('/api/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          providerId: flowState.providerId,
          tokenRequest
        })
      });

      if (!response.ok) {
        throw new Error(`Token exchange failed: ${response.statusText}`);
      }

      const tokenData = await response.json();

      const token: OAuthToken = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenType: tokenData.token_type || 'Bearer',
        expiresIn: tokenData.expires_in,
        expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000) : undefined,
        scope: tokenData.scope ? tokenData.scope.split(' ') : flowState.scopes,
        providerId: flowState.providerId,
        userId: flowState.userId,
        metadata: {
          grantedAt: new Date(),
          refreshCount: 0,
          ipAddress: tokenData.ip_address,
          userAgent: navigator.userAgent
        }
      };

      return {
        success: true,
        data: token
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TOKEN_EXCHANGE_FAILED',
          message: error instanceof Error ? error.message : 'Token exchange failed',
          userMessage: 'Failed to complete authorization process.',
          resolution: 'Please try the authorization process again.'
        }
      };
    }
  }

  private async getUserInfo(token: OAuthToken, provider: OAuthProvider): Promise<any> {
    try {
      // Provider-specific user info endpoints
      const userInfoEndpoints: Record<string, string> = {
        gmail: 'https://www.googleapis.com/oauth2/v2/userinfo',
        office365: 'https://graph.microsoft.com/v1.0/me',
        slack: 'https://slack.com/api/auth.test'
      };

      const endpoint = userInfoEndpoints[provider.providerId];
      if (!endpoint) {
        return null;
      }

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `${token.tokenType} ${token.accessToken}`
        }
      });

      if (response.ok) {
        return await response.json();
      }

      return null;
    } catch (error) {
      console.warn('Failed to fetch user info:', error);
      return null;
    }
  }

  private mapScopesToPermissions(scopes: string[], provider: OAuthProvider): string[] {
    return scopes.map(scope => {
      const scopeConfig = provider.scopes.find(s => s.scope === scope);
      return scopeConfig?.displayName || scope;
    });
  }

  private cleanupFlowState(state: string): void {
    // Remove flow state
    this.flowStates.delete(state);

    // Close and remove popup window
    const popup = this.popupWindows.get(state);
    if (popup && !popup.closed) {
      popup.close();
    }
    this.popupWindows.delete(state);

    // Remove completion handler
    delete (this as any)[`completion_${state}`];
  }

  private async emitEvent(event: OAuthEvent): Promise<void> {
    const listeners = this.eventListeners.get(event.type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error(`Error in OAuth event listener for ${event.type}:`, error);
      }
    });
  }

  private generateRequestId(): string {
    return `oauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const oauthFlowManager = new OAuthFlowManager();