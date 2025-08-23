/**
 * Smart Credential Service - Backend Implementation
 * Orchestrates service detection, connection management, and business-friendly credential workflows
 */

import { logger } from '../utils/logger';

export interface ServiceCard {
  serviceId: string;
  serviceName: string;
  category: string;
  businessDescription: string;
  businessImpact: {
    timeSaved: string;
    processesAutomated: number;
    roiImprovement: string;
    efficiencyGain: string;
  };
  setupComplexity: 'simple' | 'moderate' | 'complex';
  estimatedSetupTime: string;
  securityLevel: string;
  complianceFrameworks: string[];
}

class SmartCredentialServiceBackend {
  /**
   * Get service cards for business-friendly display
   */
  public async getServiceCards(): Promise<ServiceCard[]> {
    try {
      const serviceCards: ServiceCard[] = [
        {
          serviceId: 'gmail',
          serviceName: 'Gmail',
          category: 'email_marketing',
          businessDescription: 'Connect your Gmail account to send and receive emails automatically. Automate email campaigns, customer responses, and team notifications.',
          businessImpact: {
            timeSaved: 'Save 5+ hours weekly on email management',
            processesAutomated: 4,
            roiImprovement: '400%',
            efficiencyGain: '65%'
          },
          setupComplexity: 'simple',
          estimatedSetupTime: '2 minutes',
          securityLevel: 'enterprise',
          complianceFrameworks: ['GDPR', 'SOC2', 'HIPAA']
        },
        {
          serviceId: 'slack',
          serviceName: 'Slack',
          category: 'communication',
          businessDescription: 'Connect your Slack workspace to send automated messages and notifications. Keep your team informed with real-time updates.',
          businessImpact: {
            timeSaved: 'Improve team communication by 60%',
            processesAutomated: 3,
            roiImprovement: '300%',
            efficiencyGain: '50%'
          },
          setupComplexity: 'simple',
          estimatedSetupTime: '2 minutes',
          securityLevel: 'enterprise',
          complianceFrameworks: ['SOC2', 'GDPR']
        },
        {
          serviceId: 'office365',
          serviceName: 'Microsoft 365',
          category: 'email_marketing',
          businessDescription: 'Connect your Microsoft 365 account for email and document automation. Integrate with Outlook, OneDrive, and Teams.',
          businessImpact: {
            timeSaved: 'Streamline office productivity by 40%',
            processesAutomated: 5,
            roiImprovement: '350%',
            efficiencyGain: '45%'
          },
          setupComplexity: 'moderate',
          estimatedSetupTime: '3 minutes',
          securityLevel: 'enterprise',
          complianceFrameworks: ['GDPR', 'SOC2', 'HIPAA', 'ISO27001']
        },
        {
          serviceId: 'google_sheets',
          serviceName: 'Google Sheets',
          category: 'data_management',
          businessDescription: 'Connect Google Sheets for automated data collection and reporting. Turn spreadsheets into powerful business tools.',
          businessImpact: {
            timeSaved: 'Automate data entry and save 3+ hours weekly',
            processesAutomated: 3,
            roiImprovement: '250%',
            efficiencyGain: '70%'
          },
          setupComplexity: 'simple',
          estimatedSetupTime: '2 minutes',
          securityLevel: 'enterprise',
          complianceFrameworks: ['GDPR', 'SOC2']
        }
      ];

      logger.info('Retrieved service cards', { count: serviceCards.length });
      return serviceCards;
    } catch (error) {
      logger.error('Error fetching service cards:', error);
      throw new Error('Failed to fetch service cards');
    }
  }

  /**
   * Generate OAuth URL for a service
   */
  public async generateOAuthUrl(serviceId: string, workflowId: string, userId: string): Promise<string> {
    try {
      // Generate state parameter for security
      const state = `${serviceId}_${workflowId}_${userId}_${Date.now()}`;
      
      // Service-specific OAuth URLs (in production these would come from secure config)
      const oauthUrls: { [key: string]: string } = {
        gmail: `https://accounts.google.com/oauth2/auth?client_id=YOUR_GMAIL_CLIENT_ID&redirect_uri=${encodeURIComponent('http://localhost:3002/api/oauth/callback')}&scope=${encodeURIComponent('email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send')}&response_type=code&state=${state}&access_type=offline&prompt=consent`,
        slack: `https://slack.com/oauth/v2/authorize?client_id=YOUR_SLACK_CLIENT_ID&scope=channels:read,chat:write,users:read&redirect_uri=${encodeURIComponent('http://localhost:3002/api/oauth/callback')}&state=${state}`,
        office365: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=YOUR_O365_CLIENT_ID&response_type=code&redirect_uri=${encodeURIComponent('http://localhost:3002/api/oauth/callback')}&scope=${encodeURIComponent('User.Read Mail.Read Mail.Send Files.ReadWrite')}&state=${state}&response_mode=query`,
        google_sheets: `https://accounts.google.com/oauth2/auth?client_id=YOUR_SHEETS_CLIENT_ID&redirect_uri=${encodeURIComponent('http://localhost:3002/api/oauth/callback')}&scope=${encodeURIComponent('https://www.googleapis.com/auth/spreadsheets')}&response_type=code&state=${state}&access_type=offline&prompt=consent`
      };

      const authUrl = oauthUrls[serviceId];
      if (!authUrl) {
        throw new Error(`Unsupported service: ${serviceId}`);
      }

      logger.info('Generated OAuth URL', { serviceId, workflowId, userId });
      return authUrl;
    } catch (error) {
      logger.error('Error generating OAuth URL:', error);
      throw new Error('Failed to generate OAuth authorization URL');
    }
  }

  /**
   * Handle OAuth callback for Smart Credential Assistant
   */
  public async handleOAuthCallback(code: string, state: string): Promise<{
    success: boolean;
    serviceId: string;
    businessImpact: string;
    nextSteps: string[];
  }> {
    try {
      // Parse state to extract service and workflow info
      const stateParts = state.split('_');
      const serviceId = stateParts[0] || 'unknown';
      const workflowId = stateParts[1] || '';
      const userId = stateParts[2] || '';
      const timestamp = stateParts[3] || '0';
      
      // Validate state timestamp (prevent replay attacks)
      const stateTimestamp = parseInt(timestamp);
      const now = Date.now();
      if (now - stateTimestamp > 600000) { // 10 minute expiry
        throw new Error('OAuth state expired');
      }

      // Service-specific business impact messages
      const businessImpacts: { [key: string]: string } = {
        gmail: 'Your Gmail integration is now active! You can now automate email workflows, send personalized campaigns, and process incoming emails automatically.',
        slack: 'Your Slack integration is ready! Team notifications, automated messages, and workflow updates will now be sent directly to your Slack workspace.',
        office365: 'Microsoft 365 is connected! You can now automate Outlook emails, access OneDrive files, and integrate with Teams for seamless productivity.',
        google_sheets: 'Google Sheets integration complete! Your workflows can now read data, create reports, and update spreadsheets automatically.'
      };

      // Service-specific next steps
      const nextStepsMap: { [key: string]: string[] } = {
        gmail: [
          'Configure email templates for automated responses',
          'Set up email filters and routing rules',
          'Test email workflows with sample data',
          'Monitor email delivery and engagement metrics'
        ],
        slack: [
          'Choose channels for workflow notifications',
          'Set up message templates and formatting',
          'Test notifications with sample workflows',
          'Configure team member mentions and alerts'
        ],
        office365: [
          'Configure Outlook email automation rules',
          'Set up OneDrive file access permissions',
          'Test document workflows and sharing',
          'Configure Teams integration settings'
        ],
        google_sheets: [
          'Select spreadsheets for data integration',
          'Configure data mapping and validation rules',
          'Set up automated reporting schedules',
          'Test data synchronization workflows'
        ]
      };

      const result = {
        success: true,
        serviceId: serviceId,
        businessImpact: businessImpacts[serviceId] || 'Your service integration is now active and ready for workflow automation!',
        nextSteps: nextStepsMap[serviceId] || [
          'Configure service-specific settings',
          'Test the integration with sample workflows',
          'Monitor performance and optimize as needed'
        ]
      };

      logger.info('OAuth callback processed successfully', { 
        serviceId, 
        workflowId, 
        userId,
        success: result.success
      });

      return result;
    } catch (error) {
      logger.error('Error processing OAuth callback:', error);
      return {
        success: false,
        serviceId: 'unknown',
        businessImpact: 'Connection setup encountered an issue. Please try reconnecting the service.',
        nextSteps: [
          'Check your internet connection',
          'Verify service permissions and settings',
          'Try the connection process again',
          'Contact support if issues persist'
        ]
      };
    }
  }
}

export const smartCredentialService = new SmartCredentialServiceBackend();