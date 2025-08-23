/**
 * Service Detector
 * Phase 1: Smart Service Detection for workflow analysis
 */

import { logger } from '../utils/logger';

export interface DetectedService {
  serviceId: string;
  serviceName: string;
  category: string;
  businessDescription: string;
  confidence: number;
  setupComplexity: 'simple' | 'moderate' | 'complex';
  estimatedSetupTime: string;
  businessValue: string;
  requiredScopes: string[];
  supportedFeatures: string[];
}

export interface ServiceDetectionResult {
  services: DetectedService[];
  businessImpact: {
    timesSaved: string;
    efficiency: string;
    roi: string;
  };
  setupComplexity: 'simple' | 'moderate' | 'complex';
  estimatedValue: number;
  recommendations: string[];
}

class ServiceDetectorService {
  private availableServices: DetectedService[] = [
    {
      serviceId: 'gmail',
      serviceName: 'Gmail',
      category: 'email_marketing',
      businessDescription: 'Connect your Gmail account to send and receive emails automatically',
      confidence: 0.95,
      setupComplexity: 'simple',
      estimatedSetupTime: '2 minutes',
      businessValue: 'Save 5+ hours weekly on email management',
      requiredScopes: ['email', 'https://www.googleapis.com/auth/gmail.readonly'],
      supportedFeatures: ['Send emails', 'Read inbox', 'Email automation', 'Contact management']
    },
    {
      serviceId: 'slack',
      serviceName: 'Slack',
      category: 'communication',
      businessDescription: 'Connect your Slack workspace to send automated messages and notifications',
      confidence: 0.90,
      setupComplexity: 'simple',
      estimatedSetupTime: '2 minutes',
      businessValue: 'Improve team communication by 60%',
      requiredScopes: ['channels:read', 'chat:write'],
      supportedFeatures: ['Send messages', 'Channel notifications', 'Team communication', 'Bot integration']
    },
    {
      serviceId: 'office365',
      serviceName: 'Microsoft 365',
      category: 'email_marketing',
      businessDescription: 'Connect your Microsoft 365 account for email and document automation',
      confidence: 0.85,
      setupComplexity: 'moderate',
      estimatedSetupTime: '3 minutes',
      businessValue: 'Streamline office productivity by 40%',
      requiredScopes: ['User.Read', 'Mail.Read'],
      supportedFeatures: ['Outlook email', 'OneDrive storage', 'Teams integration', 'Calendar access']
    },
    {
      serviceId: 'google_sheets',
      serviceName: 'Google Sheets',
      category: 'data_management',
      businessDescription: 'Connect Google Sheets for automated data collection and reporting',
      confidence: 0.80,
      setupComplexity: 'simple',
      estimatedSetupTime: '2 minutes',
      businessValue: 'Automate data entry and save 3+ hours weekly',
      requiredScopes: ['https://www.googleapis.com/auth/spreadsheets'],
      supportedFeatures: ['Read sheets', 'Write data', 'Create reports', 'Data synchronization']
    }
  ];

  /**
   * Analyze workflow template to detect required services
   */
  async analyzeWorkflow(workflowTemplate: any, businessContext?: string): Promise<ServiceDetectionResult> {
    try {
      logger.info('Analyzing workflow for service detection', { 
        workflowId: workflowTemplate.id,
        businessContext 
      });

      // Simulate intelligent service detection based on workflow content
      const detectedServices: DetectedService[] = [];
      
      // Basic detection logic - in real implementation this would use AI/ML
      const workflowName = workflowTemplate.businessName?.toLowerCase() || '';
      const workflowDescription = workflowTemplate.businessDescription?.toLowerCase() || '';
      const features = workflowTemplate.features || [];
      
      // Detect email services
      if (workflowName.includes('email') || workflowDescription.includes('email') || 
          features.some((f: string) => f.toLowerCase().includes('email'))) {
        detectedServices.push(this.availableServices.find(s => s.serviceId === 'gmail')!);
      }
      
      // Detect communication services
      if (workflowName.includes('notification') || workflowDescription.includes('team') ||
          features.some((f: string) => f.toLowerCase().includes('notification'))) {
        detectedServices.push(this.availableServices.find(s => s.serviceId === 'slack')!);
      }
      
      // Detect data services
      if (workflowName.includes('data') || workflowDescription.includes('report') ||
          features.some((f: string) => f.toLowerCase().includes('tracking'))) {
        detectedServices.push(this.availableServices.find(s => s.serviceId === 'google_sheets')!);
      }

      // If no specific services detected, suggest popular ones
      if (detectedServices.length === 0) {
        detectedServices.push(this.availableServices.find(s => s.serviceId === 'gmail')!);
        detectedServices.push(this.availableServices.find(s => s.serviceId === 'slack')!);
      }

      const result: ServiceDetectionResult = {
        services: detectedServices,
        businessImpact: {
          timesSaved: '8+ hours weekly',
          efficiency: '65% improvement',
          roi: '350% in first year'
        },
        setupComplexity: this.calculateOverallComplexity(detectedServices),
        estimatedValue: workflowTemplate.monthlyValue || 2500,
        recommendations: this.generateRecommendations(detectedServices, businessContext)
      };

      logger.info('Service detection completed', { 
        workflowId: workflowTemplate.id,
        servicesDetected: detectedServices.length,
        estimatedValue: result.estimatedValue
      });

      return result;
    } catch (error) {
      logger.error('Service detection failed', error);
      throw new Error('Failed to analyze workflow for service detection');
    }
  }

  /**
   * Get all available services
   */
  async getAvailableServices(): Promise<DetectedService[]> {
    return this.availableServices;
  }

  /**
   * Calculate overall setup complexity
   */
  private calculateOverallComplexity(services: DetectedService[]): 'simple' | 'moderate' | 'complex' {
    if (services.length === 0) return 'simple';
    
    const complexityScores = services.map(s => {
      switch (s.setupComplexity) {
        case 'simple': return 1;
        case 'moderate': return 2;
        case 'complex': return 3;
        default: return 1;
      }
    });
    
    const avgComplexity = complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length;
    
    if (avgComplexity <= 1.5) return 'simple';
    if (avgComplexity <= 2.5) return 'moderate';
    return 'complex';
  }

  /**
   * Generate business recommendations
   */
  private generateRecommendations(services: DetectedService[], businessContext?: string): string[] {
    const recommendations: string[] = [];
    
    if (services.some(s => s.serviceId === 'gmail')) {
      recommendations.push('Start with Gmail integration for immediate email automation benefits');
    }
    
    if (services.some(s => s.serviceId === 'slack')) {
      recommendations.push('Add Slack integration to improve team communication and notifications');
    }
    
    if (services.length > 2) {
      recommendations.push('Consider implementing services in phases to reduce setup complexity');
    }
    
    if (businessContext?.includes('e-commerce') || businessContext?.includes('sales')) {
      recommendations.push('Focus on customer communication workflows for maximum ROI');
    }
    
    recommendations.push('Test each integration before moving to production use');
    
    return recommendations;
  }
}

export const serviceDetector = new ServiceDetectorService();