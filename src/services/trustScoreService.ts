import {
  TrustScore,
  TrustScoreComponent,
  ScoreFactor,
  BenchmarkComparison,
  TrustScoreBusinessImpact,
  TrustScoreRecommendation,
  TrustScoreHistory,
  SecurityIndicators,
  CredentialHealth
} from '../types/smartCredentials';
import { logger } from '../utils/logger';

export interface TrustScoreConfig {
  weights: {
    security: number;
    compliance: number;
    permissions: number;
    monitoring: number;
    encryption: number;
    accessControl: number;
  };
  industryBenchmarks: {
    [industry: string]: number;
  };
  riskThresholds: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
}

export interface TrustScoreCalculation {
  credentialId?: string;
  organizationId: string;
  securityIndicators: SecurityIndicators;
  credentialHealth?: CredentialHealth;
  businessContext: {
    industry: string;
    businessCriticality: 'low' | 'medium' | 'high' | 'critical';
    complianceRequirements: string[];
  };
}

export class TrustScoreService {
  private readonly defaultConfig: TrustScoreConfig = {
    weights: {
      security: 0.25,
      compliance: 0.20,
      permissions: 0.20,
      monitoring: 0.15,
      encryption: 0.15,
      accessControl: 0.05
    },
    industryBenchmarks: {
      'financial_services': 88,
      'healthcare': 90,
      'technology': 85,
      'retail': 82,
      'manufacturing': 80,
      'education': 78,
      'government': 92,
      'default': 82
    },
    riskThresholds: {
      excellent: 90,
      good: 75,
      fair: 60,
      poor: 40
    }
  };

  private scoreHistory: Map<string, TrustScoreHistory[]> = new Map();
  private cachedScores: Map<string, TrustScore> = new Map();
  private config: TrustScoreConfig;

  constructor(config?: TrustScoreConfig) {
    this.config = config || this.defaultConfig;
    logger.info('Trust Score Service initialized', { config: this.config });
  }

  /**
   * Calculate comprehensive trust score
   */
  public async calculateTrustScore(
    calculation: TrustScoreCalculation
  ): Promise<TrustScore> {
    try {
      const key = calculation.credentialId || calculation.organizationId;
      
      logger.info(`Calculating trust score for ${key}`);

      // Calculate component scores
      const components = await this.calculateComponents(calculation);
      
      // Calculate overall score
      const overall = this.calculateOverallScore(components);
      
      // Determine trend
      const trend = this.calculateTrend(key, overall);
      
      // Generate benchmark comparison
      const benchmarkComparison = this.calculateBenchmarkComparison(
        overall,
        calculation.businessContext.industry
      );
      
      // Assess business impact
      const businessImpact = this.assessBusinessImpact(overall, components, calculation);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(components, overall, calculation);
      
      // Update history
      this.updateScoreHistory(key, overall, 'Periodic assessment');

      const trustScore: TrustScore = {
        overall,
        components,
        lastCalculated: new Date(),
        trend,
        benchmarkComparison,
        businessImpact,
        recommendations,
        historicalData: this.scoreHistory.get(key) || []
      };

      // Cache the score
      this.cachedScores.set(key, trustScore);

      logger.info(`Trust score calculated for ${key}`, {
        overall,
        trend,
        componentsCount: components.length
      });

      return trustScore;
    } catch (error) {
      logger.error('Trust score calculation failed:', error);
      throw new Error('Failed to calculate trust score');
    }
  }

  /**
   * Get cached trust score if available
   */
  public getCachedTrustScore(key: string): TrustScore | null {
    return this.cachedScores.get(key) || null;
  }

  /**
   * Calculate trust score for multiple credentials
   */
  public async calculateOrganizationTrustScore(
    organizationId: string,
    credentialCalculations: TrustScoreCalculation[]
  ): Promise<{
    organizationScore: TrustScore;
    credentialScores: Array<{ credentialId: string; score: TrustScore }>;
    organizationSummary: {
      totalCredentials: number;
      averageScore: number;
      highRiskCredentials: number;
      excellentCredentials: number;
      improvementOpportunity: number;
    };
  }> {
    try {
      logger.info(`Calculating organization trust score for ${organizationId}`);

      // Calculate individual credential scores
      const credentialScores: Array<{ credentialId: string; score: TrustScore }> = [];
      
      for (const calc of credentialCalculations) {
        const score = await this.calculateTrustScore(calc);
        credentialScores.push({
          credentialId: calc.credentialId!,
          score
        });
      }

      // Aggregate organization score
      const organizationScore = await this.aggregateOrganizationScore(
        organizationId,
        credentialScores.map(cs => cs.score),
        credentialCalculations[0]?.businessContext
      );

      // Calculate summary metrics
      const organizationSummary = this.calculateOrganizationSummary(credentialScores);

      return {
        organizationScore,
        credentialScores,
        organizationSummary
      };
    } catch (error) {
      logger.error('Organization trust score calculation failed:', error);
      throw new Error('Failed to calculate organization trust score');
    }
  }

  /**
   * Get trust score trend analysis
   */
  public getTrustScoreTrend(
    key: string,
    days: number = 30
  ): {
    trend: 'improving' | 'stable' | 'declining';
    changePercentage: number;
    trendAnalysis: string;
    recommendations: string[];
  } {
    const history = this.scoreHistory.get(key) || [];
    
    if (history.length < 2) {
      return {
        trend: 'stable',
        changePercentage: 0,
        trendAnalysis: 'Insufficient historical data for trend analysis',
        recommendations: ['Continue monitoring to establish trend baseline']
      };
    }

    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter(h => h.date >= cutoffDate);
    
    if (recentHistory.length < 2) {
      return {
        trend: 'stable',
        changePercentage: 0,
        trendAnalysis: 'Recent data insufficient for trend analysis',
        recommendations: ['Continue regular assessments for better trend visibility']
      };
    }

    const earliest = recentHistory[0];
    const latest = recentHistory[recentHistory.length - 1];
    const changePercentage = ((latest.score - earliest.score) / earliest.score) * 100;

    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (Math.abs(changePercentage) > 5) {
      trend = changePercentage > 0 ? 'improving' : 'declining';
    }

    const trendAnalysis = this.generateTrendAnalysis(trend, changePercentage, recentHistory);
    const recommendations = this.generateTrendRecommendations(trend, changePercentage);

    return {
      trend,
      changePercentage: Math.round(changePercentage * 100) / 100,
      trendAnalysis,
      recommendations
    };
  }

  /**
   * Compare trust scores across different timeframes
   */
  public compareTrustScores(
    scores: TrustScore[],
    comparisonType: 'credentials' | 'timeframes' | 'organizations'
  ): {
    bestPerforming: TrustScore;
    worstPerforming: TrustScore;
    averageScore: number;
    scoreDistribution: {
      excellent: number;
      good: number;
      fair: number;
      poor: number;
    };
    insights: string[];
    recommendations: string[];
  } {
    if (scores.length === 0) {
      throw new Error('No scores provided for comparison');
    }

    const sortedScores = [...scores].sort((a, b) => b.overall - a.overall);
    const bestPerforming = sortedScores[0];
    const worstPerforming = sortedScores[sortedScores.length - 1];
    const averageScore = scores.reduce((sum, s) => sum + s.overall, 0) / scores.length;

    const scoreDistribution = {
      excellent: scores.filter(s => s.overall >= this.config.riskThresholds.excellent).length,
      good: scores.filter(s => s.overall >= this.config.riskThresholds.good && s.overall < this.config.riskThresholds.excellent).length,
      fair: scores.filter(s => s.overall >= this.config.riskThresholds.fair && s.overall < this.config.riskThresholds.good).length,
      poor: scores.filter(s => s.overall < this.config.riskThresholds.fair).length
    };

    const insights = this.generateComparisonInsights(scores, scoreDistribution, comparisonType);
    const recommendations = this.generateComparisonRecommendations(scoreDistribution, averageScore);

    return {
      bestPerforming,
      worstPerforming,
      averageScore: Math.round(averageScore * 100) / 100,
      scoreDistribution,
      insights,
      recommendations
    };
  }

  /**
   * Generate trust score report
   */
  public generateTrustScoreReport(
    trustScore: TrustScore,
    options: {
      includeRecommendations: boolean;
      includeHistory: boolean;
      includeBenchmarks: boolean;
      businessFocused: boolean;
    } = {
      includeRecommendations: true,
      includeHistory: true,
      includeBenchmarks: true,
      businessFocused: true
    }
  ): {
    executiveSummary: string;
    detailedAnalysis: string;
    keyFindings: string[];
    actionItems: string[];
    businessImplications: string[];
    exportData: any;
  } {
    const executiveSummary = this.generateExecutiveSummary(trustScore, options.businessFocused);
    const detailedAnalysis = this.generateDetailedAnalysis(trustScore);
    const keyFindings = this.generateKeyFindings(trustScore);
    const actionItems = this.generateActionItems(trustScore);
    const businessImplications = this.generateBusinessImplications(trustScore);
    const exportData = this.generateExportData(trustScore, options);

    return {
      executiveSummary,
      detailedAnalysis,
      keyFindings,
      actionItems,
      businessImplications,
      exportData
    };
  }

  // Private helper methods

  private async calculateComponents(calculation: TrustScoreCalculation): Promise<TrustScoreComponent[]> {
    const components: TrustScoreComponent[] = [];

    // Security component
    components.push(await this.calculateSecurityComponent(calculation));
    
    // Compliance component
    components.push(await this.calculateComplianceComponent(calculation));
    
    // Permissions component
    components.push(await this.calculatePermissionsComponent(calculation));
    
    // Monitoring component
    components.push(await this.calculateMonitoringComponent(calculation));
    
    // Encryption component
    components.push(await this.calculateEncryptionComponent(calculation));
    
    // Access Control component
    components.push(await this.calculateAccessControlComponent(calculation));

    return components;
  }

  private async calculateSecurityComponent(calculation: TrustScoreCalculation): Promise<TrustScoreComponent> {
    const indicators = calculation.securityIndicators;
    let score = indicators.trustScore;
    
    // Adjust score based on risk level
    if (indicators.riskLevel === 'critical') score = Math.min(score, 40);
    else if (indicators.riskLevel === 'high') score = Math.min(score, 60);
    else if (indicators.riskLevel === 'medium') score = Math.min(score, 80);

    const factors: ScoreFactor[] = [
      {
        factor: 'Overall security posture',
        contribution: score - 50,
        businessDescription: 'Measures the comprehensive security strength of your systems',
        actionable: true,
        improvementAction: score < 80 ? 'Implement security recommendations to improve posture' : undefined
      },
      {
        factor: 'Risk assessment',
        contribution: indicators.riskLevel === 'low' ? 15 : indicators.riskLevel === 'medium' ? 5 : -10,
        businessDescription: 'Current risk exposure to security threats',
        actionable: true,
        improvementAction: indicators.riskLevel !== 'low' ? 'Address identified security risks' : undefined
      }
    ];

    return {
      component: 'security',
      score: Math.max(0, Math.min(100, score)),
      weight: this.config.weights.security,
      status: this.getComponentStatus(score),
      factors,
      businessMeaning: 'Represents the overall security strength and risk posture of your systems',
      improvementPotential: Math.max(0, 90 - score)
    };
  }

  private async calculateComplianceComponent(calculation: TrustScoreCalculation): Promise<TrustScoreComponent> {
    const compliance = calculation.securityIndicators.complianceStatus;
    let score = 0;

    if (compliance.frameworks.length > 0) {
      score = compliance.frameworks.reduce((sum, f) => sum + f.score, 0) / compliance.frameworks.length;
    } else {
      score = 60; // Default score when no frameworks configured
    }

    // Adjust for critical issues
    if (compliance.criticalIssues > 0) {
      score = Math.max(40, score - (compliance.criticalIssues * 15));
    }

    const factors: ScoreFactor[] = [
      {
        factor: 'Compliance framework alignment',
        contribution: score - 70,
        businessDescription: 'How well your systems meet regulatory and industry standards',
        actionable: true,
        improvementAction: score < 80 ? 'Address compliance gaps and improve framework alignment' : undefined
      },
      {
        factor: 'Critical compliance issues',
        contribution: compliance.criticalIssues > 0 ? -20 : 10,
        businessDescription: 'Outstanding critical compliance issues requiring attention',
        actionable: compliance.criticalIssues > 0,
        improvementAction: compliance.criticalIssues > 0 ? `Address ${compliance.criticalIssues} critical compliance issues` : undefined
      }
    ];

    return {
      component: 'compliance',
      score: Math.max(0, Math.min(100, score)),
      weight: this.config.weights.compliance,
      status: this.getComponentStatus(score),
      factors,
      businessMeaning: 'Indicates compliance with regulatory requirements and industry standards',
      improvementPotential: Math.max(0, 90 - score)
    };
  }

  private async calculatePermissionsComponent(calculation: TrustScoreCalculation): Promise<TrustScoreComponent> {
    const permissions = calculation.securityIndicators.permissionHealth;
    let score = 80; // Base score

    // Adjust based on permission health
    switch (permissions.status) {
      case 'healthy': score = 90; break;
      case 'attention_needed': score = 70; break;
      case 'critical': score = 40; break;
      case 'misconfigured': score = 30; break;
    }

    // Adjust for excessive permissions
    score -= Math.min(30, permissions.excessivePermissions * 5);
    
    // Adjust for missing permissions
    score -= Math.min(20, permissions.missingPermissions * 3);

    const factors: ScoreFactor[] = [
      {
        factor: 'Permission optimization',
        contribution: score - 70,
        businessDescription: 'How well permissions follow the principle of least privilege',
        actionable: true,
        improvementAction: score < 80 ? 'Optimize permissions to reduce security risk' : undefined
      },
      {
        factor: 'Excessive permissions',
        contribution: permissions.excessivePermissions > 0 ? -15 : 10,
        businessDescription: 'Permissions that exceed business requirements',
        actionable: permissions.excessivePermissions > 0,
        improvementAction: permissions.excessivePermissions > 0 ? `Remove ${permissions.excessivePermissions} excessive permissions` : undefined
      }
    ];

    return {
      component: 'permissions',
      score: Math.max(0, Math.min(100, score)),
      weight: this.config.weights.permissions,
      status: this.getComponentStatus(score),
      factors,
      businessMeaning: 'Measures how well access permissions are managed and optimized',
      improvementPotential: Math.max(0, 90 - score)
    };
  }

  private async calculateMonitoringComponent(calculation: TrustScoreCalculation): Promise<TrustScoreComponent> {
    let score = 75; // Base monitoring score
    
    // Check if credential health monitoring is available
    if (calculation.credentialHealth) {
      const health = calculation.credentialHealth;
      
      // Adjust based on health status
      switch (health.status) {
        case 'healthy': score += 15; break;
        case 'warning': score += 5; break;
        case 'critical': score -= 20; break;
        case 'expired': score -= 30; break;
        case 'compromised': score -= 40; break;
      }

      // Adjust based on alerts
      score -= Math.min(20, health.alerts.filter(a => !a.resolvedAt).length * 5);
    }

    const factors: ScoreFactor[] = [
      {
        factor: 'Health monitoring',
        contribution: calculation.credentialHealth ? 15 : -10,
        businessDescription: 'Real-time monitoring of credential health and performance',
        actionable: !calculation.credentialHealth,
        improvementAction: !calculation.credentialHealth ? 'Implement credential health monitoring' : undefined
      },
      {
        factor: 'Alert management',
        contribution: calculation.credentialHealth?.alerts.filter(a => !a.resolvedAt).length === 0 ? 10 : -5,
        businessDescription: 'How well security alerts are managed and resolved',
        actionable: true,
        improvementAction: calculation.credentialHealth?.alerts.some(a => !a.resolvedAt) ? 'Resolve outstanding security alerts' : undefined
      }
    ];

    return {
      component: 'monitoring',
      score: Math.max(0, Math.min(100, score)),
      weight: this.config.weights.monitoring,
      status: this.getComponentStatus(score),
      factors,
      businessMeaning: 'Indicates the quality of security monitoring and alert management',
      improvementPotential: Math.max(0, 90 - score)
    };
  }

  private async calculateEncryptionComponent(calculation: TrustScoreCalculation): Promise<TrustScoreComponent> {
    const encryption = calculation.securityIndicators.encryptionStatus;
    let score = 60; // Base score

    // Adjust based on encryption status
    switch (encryption.status) {
      case 'encrypted': score = 90; break;
      case 'partially_encrypted': score = 70; break;
      case 'not_encrypted': score = 20; break;
    }

    // Adjust based on key strength
    switch (encryption.keyStrength) {
      case 'enterprise': score += 10; break;
      case 'strong': score += 5; break;
      case 'good': break;
      case 'weak': score -= 20; break;
    }

    const factors: ScoreFactor[] = [
      {
        factor: 'Encryption coverage',
        contribution: score - 70,
        businessDescription: 'How comprehensively your data is protected with encryption',
        actionable: true,
        improvementAction: score < 80 ? 'Improve encryption coverage and strength' : undefined
      },
      {
        factor: 'Key management',
        contribution: encryption.keyStrength === 'enterprise' ? 15 : encryption.keyStrength === 'weak' ? -15 : 0,
        businessDescription: 'Quality of encryption key management practices',
        actionable: encryption.keyStrength !== 'enterprise',
        improvementAction: encryption.keyStrength !== 'enterprise' ? 'Upgrade to enterprise-grade key management' : undefined
      }
    ];

    return {
      component: 'encryption',
      score: Math.max(0, Math.min(100, score)),
      weight: this.config.weights.encryption,
      status: this.getComponentStatus(score),
      factors,
      businessMeaning: 'Measures the strength and coverage of data encryption',
      improvementPotential: Math.max(0, 95 - score)
    };
  }

  private async calculateAccessControlComponent(calculation: TrustScoreCalculation): Promise<TrustScoreComponent> {
    let score = 75; // Base access control score

    // This could be enhanced with more specific access control metrics
    // For now, we'll base it on permission health and security indicators

    const factors: ScoreFactor[] = [
      {
        factor: 'Access control policies',
        contribution: 5,
        businessDescription: 'How well access to systems and data is controlled',
        actionable: true,
        improvementAction: 'Review and strengthen access control policies'
      }
    ];

    return {
      component: 'access_control',
      score: Math.max(0, Math.min(100, score)),
      weight: this.config.weights.accessControl,
      status: this.getComponentStatus(score),
      factors,
      businessMeaning: 'Indicates the effectiveness of access control measures',
      improvementPotential: Math.max(0, 85 - score)
    };
  }

  private calculateOverallScore(components: TrustScoreComponent[]): number {
    const weightedSum = components.reduce((sum, comp) => sum + (comp.score * comp.weight), 0);
    const totalWeight = components.reduce((sum, comp) => sum + comp.weight, 0);
    return Math.round(weightedSum / totalWeight);
  }

  private calculateTrend(key: string, currentScore: number): 'improving' | 'stable' | 'declining' {
    const history = this.scoreHistory.get(key) || [];
    
    if (history.length === 0) {
      return 'stable';
    }

    const lastScore = history[history.length - 1].score;
    const scoreDiff = currentScore - lastScore;
    
    if (Math.abs(scoreDiff) <= 2) return 'stable';
    return scoreDiff > 0 ? 'improving' : 'declining';
  }

  private calculateBenchmarkComparison(
    score: number,
    industry: string
  ): BenchmarkComparison {
    const industryAverage = this.config.industryBenchmarks[industry] || this.config.industryBenchmarks.default;
    const bestPractice = 95; // Industry best practice
    const bestPracticeGap = bestPractice - score;

    let peerComparison: 'above_average' | 'average' | 'below_average' = 'average';
    if (score > industryAverage + 5) peerComparison = 'above_average';
    else if (score < industryAverage - 5) peerComparison = 'below_average';

    let competitivePosition: 'leader' | 'follower' | 'laggard' = 'follower';
    if (score >= bestPractice - 5) competitivePosition = 'leader';
    else if (score < industryAverage - 10) competitivePosition = 'laggard';

    const improvementOpportunity = this.generateImprovementOpportunity(score, industryAverage, bestPractice);

    return {
      industryAverage,
      peerComparison,
      bestPracticeGap,
      competitivePosition,
      improvementOpportunity
    };
  }

  private assessBusinessImpact(
    overall: number,
    components: TrustScoreComponent[],
    calculation: TrustScoreCalculation
  ): TrustScoreBusinessImpact {
    const riskExposure = this.calculateRiskExposure(overall);
    const insurancePremiumImpact = this.calculateInsurancePremiumImpact(overall);
    const clientTrustLevel = this.calculateClientTrustLevel(overall);
    const competitiveAdvantage = this.calculateCompetitiveAdvantage(overall, calculation.businessContext.industry);
    const regulatoryStanding = this.calculateRegulatoryStanding(components);
    const businessContinuityRisk = this.calculateBusinessContinuityRisk(overall, calculation.businessContext.businessCriticality);

    return {
      riskExposure,
      insurancePremiumImpact,
      clientTrustLevel,
      competitiveAdvantage,
      regulatoryStanding,
      businessContinuityRisk
    };
  }

  private generateRecommendations(
    components: TrustScoreComponent[],
    overall: number,
    calculation: TrustScoreCalculation
  ): TrustScoreRecommendation[] {
    const recommendations: TrustScoreRecommendation[] = [];

    // Component-specific recommendations
    for (const component of components) {
      if (component.score < 80 && component.improvementPotential > 10) {
        recommendations.push(this.createComponentRecommendation(component, calculation));
      }
    }

    // Overall score recommendations
    if (overall < 80) {
      recommendations.push(this.createOverallScoreRecommendation(overall, components));
    }

    // Sort by priority and impact
    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private updateScoreHistory(key: string, score: number, reason: string): void {
    if (!this.scoreHistory.has(key)) {
      this.scoreHistory.set(key, []);
    }

    const history = this.scoreHistory.get(key)!;
    history.push({
      date: new Date(),
      score,
      changeReason: reason
    });

    // Keep only last 100 entries
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  // Additional helper methods

  private getComponentStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' | 'critical' {
    if (score >= this.config.riskThresholds.excellent) return 'excellent';
    if (score >= this.config.riskThresholds.good) return 'good';
    if (score >= this.config.riskThresholds.fair) return 'fair';
    if (score >= this.config.riskThresholds.poor) return 'poor';
    return 'critical';
  }

  private calculateRiskExposure(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 85) return 'low';
    if (score >= 70) return 'medium';
    if (score >= 50) return 'high';
    return 'critical';
  }

  private calculateInsurancePremiumImpact(score: number): string {
    if (score >= 90) return 'Potential 10-15% premium reduction due to excellent security posture';
    if (score >= 80) return 'Standard insurance rates with good security practices';
    if (score >= 60) return 'Potential 5-10% premium increase due to moderate security risks';
    return 'Significant premium increase or coverage limitations due to high security risks';
  }

  private calculateClientTrustLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= 85) return 'high';
    if (score >= 70) return 'medium';
    return 'low';
  }

  private calculateCompetitiveAdvantage(score: number, industry: string): string {
    const benchmark = this.config.industryBenchmarks[industry] || this.config.industryBenchmarks.default;
    
    if (score >= benchmark + 10) {
      return 'Strong competitive advantage through superior security practices';
    } else if (score >= benchmark) {
      return 'Competitive parity with good security standards';
    } else if (score >= benchmark - 10) {
      return 'Slight competitive disadvantage in security-conscious markets';
    } else {
      return 'Significant competitive disadvantage due to security concerns';
    }
  }

  private calculateRegulatoryStanding(components: TrustScoreComponent[]): 'compliant' | 'at_risk' | 'non_compliant' {
    const complianceComponent = components.find(c => c.component === 'compliance');
    
    if (!complianceComponent) return 'at_risk';
    
    if (complianceComponent.score >= 85) return 'compliant';
    if (complianceComponent.score >= 60) return 'at_risk';
    return 'non_compliant';
  }

  private calculateBusinessContinuityRisk(
    score: number,
    businessCriticality: string
  ): 'low' | 'medium' | 'high' {
    const riskMultiplier = businessCriticality === 'critical' ? 1.5 :
                          businessCriticality === 'high' ? 1.2 :
                          businessCriticality === 'medium' ? 1.0 : 0.8;

    const adjustedScore = score / riskMultiplier;
    
    if (adjustedScore >= 80) return 'low';
    if (adjustedScore >= 60) return 'medium';
    return 'high';
  }

  private generateImprovementOpportunity(
    score: number,
    industryAverage: number,
    bestPractice: number
  ): string {
    if (score >= bestPractice - 5) {
      return 'Maintain industry leadership position through continuous improvement';
    } else if (score >= industryAverage + 5) {
      return `Opportunity to achieve industry leadership by improving ${bestPractice - score} points`;
    } else if (score >= industryAverage - 5) {
      return `Reach above-average performance by improving ${industryAverage + 5 - score} points`;
    } else {
      return `Significant improvement needed to reach industry standards (${industryAverage - score} point gap)`;
    }
  }

  private createComponentRecommendation(
    component: TrustScoreComponent,
    calculation: TrustScoreCalculation
  ): TrustScoreRecommendation {
    const priority = component.score < 60 ? 'critical' :
                    component.score < 70 ? 'high' :
                    component.score < 80 ? 'medium' : 'low';

    const category = component.improvementPotential > 20 ? 'foundational' :
                    component.improvementPotential > 10 ? 'strategic' :
                    component.improvementPotential > 5 ? 'quick_win' : 'advanced';

    return {
      priority,
      category,
      title: `Improve ${component.component.replace('_', ' ')} Score`,
      description: `Current ${component.component} score is ${component.score}/100 with ${component.improvementPotential} points improvement potential`,
      businessValue: component.businessMeaning,
      implementationEffort: component.improvementPotential > 20 ? 'significant' :
                           component.improvementPotential > 10 ? 'moderate' : 'minimal',
      scoreImpact: Math.round(component.improvementPotential * component.weight),
      timeline: component.improvementPotential > 20 ? '3-6 months' :
               component.improvementPotential > 10 ? '1-3 months' : '2-4 weeks',
      businessROI: this.calculateBusinessROI(component.improvementPotential, component.weight)
    };
  }

  private createOverallScoreRecommendation(
    overall: number,
    components: TrustScoreComponent[]
  ): TrustScoreRecommendation {
    const lowestComponent = components.reduce((lowest, comp) =>
      comp.score < lowest.score ? comp : lowest
    );

    return {
      priority: overall < 60 ? 'critical' : 'high',
      category: 'strategic',
      title: 'Comprehensive Security Improvement',
      description: `Overall trust score of ${overall}/100 requires strategic improvement`,
      businessValue: 'Comprehensive security improvement provides maximum business value and risk reduction',
      implementationEffort: 'significant',
      scoreImpact: Math.round((90 - overall) * 0.7),
      timeline: '6-12 months',
      businessROI: 'High ROI through reduced risk, improved customer trust, and competitive advantage'
    };
  }

  private calculateBusinessROI(improvementPotential: number, weight: number): string {
    const impact = improvementPotential * weight;
    
    if (impact > 15) return 'Very high ROI through significant risk reduction and business value';
    if (impact > 10) return 'High ROI through substantial security improvements';
    if (impact > 5) return 'Good ROI through targeted security enhancements';
    return 'Moderate ROI through incremental improvements';
  }

  private async aggregateOrganizationScore(
    organizationId: string,
    credentialScores: TrustScore[],
    businessContext?: any
  ): Promise<TrustScore> {
    // Aggregate scores from all credentials
    const avgOverall = credentialScores.reduce((sum, s) => sum + s.overall, 0) / credentialScores.length;
    
    // Aggregate components
    const aggregatedComponents = await this.aggregateComponents(credentialScores);
    
    // Use organization-level business context if available
    const orgBusinessContext = businessContext || {
      industry: 'technology',
      businessCriticality: 'medium',
      complianceRequirements: ['SOC2', 'GDPR']
    };

    return {
      overall: Math.round(avgOverall),
      components: aggregatedComponents,
      lastCalculated: new Date(),
      trend: 'stable',
      benchmarkComparison: this.calculateBenchmarkComparison(
        Math.round(avgOverall),
        orgBusinessContext.industry
      ),
      businessImpact: this.assessBusinessImpact(
        Math.round(avgOverall),
        aggregatedComponents,
        { organizationId, securityIndicators: {} as any, businessContext: orgBusinessContext }
      ),
      recommendations: this.generateRecommendations(
        aggregatedComponents,
        Math.round(avgOverall),
        { organizationId, securityIndicators: {} as any, businessContext: orgBusinessContext }
      ),
      historicalData: this.scoreHistory.get(organizationId) || []
    };
  }

  private async aggregateComponents(credentialScores: TrustScore[]): Promise<TrustScoreComponent[]> {
    const componentMap = new Map<string, { totalScore: number; count: number; weight: number }>();

    // Aggregate component scores
    for (const score of credentialScores) {
      for (const component of score.components) {
        const key = component.component;
        if (!componentMap.has(key)) {
          componentMap.set(key, { totalScore: 0, count: 0, weight: component.weight });
        }
        const existing = componentMap.get(key)!;
        existing.totalScore += component.score;
        existing.count += 1;
      }
    }

    // Create aggregated components
    const aggregatedComponents: TrustScoreComponent[] = [];
    for (const [componentName, data] of componentMap) {
      const avgScore = Math.round(data.totalScore / data.count);
      aggregatedComponents.push({
        component: componentName as any,
        score: avgScore,
        weight: data.weight,
        status: this.getComponentStatus(avgScore),
        factors: [],
        businessMeaning: `Organization-wide ${componentName.replace('_', ' ')} performance`,
        improvementPotential: Math.max(0, 90 - avgScore)
      });
    }

    return aggregatedComponents;
  }

  private calculateOrganizationSummary(
    credentialScores: Array<{ credentialId: string; score: TrustScore }>
  ): {
    totalCredentials: number;
    averageScore: number;
    highRiskCredentials: number;
    excellentCredentials: number;
    improvementOpportunity: number;
  } {
    const totalCredentials = credentialScores.length;
    const averageScore = credentialScores.reduce((sum, cs) => sum + cs.score.overall, 0) / totalCredentials;
    const highRiskCredentials = credentialScores.filter(cs => cs.score.overall < 60).length;
    const excellentCredentials = credentialScores.filter(cs => cs.score.overall >= 90).length;
    const improvementOpportunity = Math.round((90 * totalCredentials) - credentialScores.reduce((sum, cs) => sum + cs.score.overall, 0));

    return {
      totalCredentials,
      averageScore: Math.round(averageScore),
      highRiskCredentials,
      excellentCredentials,
      improvementOpportunity
    };
  }

  private generateTrendAnalysis(
    trend: 'improving' | 'stable' | 'declining',
    changePercentage: number,
    history: TrustScoreHistory[]
  ): string {
    const absChange = Math.abs(changePercentage);
    
    if (trend === 'improving') {
      return `Trust score has improved by ${absChange.toFixed(1)}% over the analyzed period, indicating positive security trajectory`;
    } else if (trend === 'declining') {
      return `Trust score has declined by ${absChange.toFixed(1)}% over the analyzed period, requiring attention to reverse the trend`;
    } else {
      return `Trust score has remained stable with minimal change (${absChange.toFixed(1)}%), indicating consistent security posture`;
    }
  }

  private generateTrendRecommendations(trend: 'improving' | 'stable' | 'declining', changePercentage: number): string[] {
    if (trend === 'improving') {
      return [
        'Continue current security improvement initiatives',
        'Identify and scale successful security practices',
        'Monitor progress to maintain positive trajectory'
      ];
    } else if (trend === 'declining') {
      return [
        'Investigate root causes of security score decline',
        'Implement immediate corrective actions',
        'Increase security monitoring and assessment frequency',
        'Consider engaging security experts for review'
      ];
    } else {
      return [
        'Implement proactive security improvements',
        'Set specific security score targets',
        'Regular security assessments to identify opportunities'
      ];
    }
  }

  private generateComparisonInsights(
    scores: TrustScore[],
    distribution: any,
    comparisonType: string
  ): string[] {
    const insights: string[] = [];
    
    const total = scores.length;
    const excellentPercentage = (distribution.excellent / total) * 100;
    const poorPercentage = ((distribution.poor) / total) * 100;

    insights.push(`${excellentPercentage.toFixed(1)}% of ${comparisonType} achieve excellent security scores (90+)`);
    
    if (poorPercentage > 0) {
      insights.push(`${poorPercentage.toFixed(1)}% of ${comparisonType} require immediate security attention (score < 60)`);
    }

    const scoreRange = Math.max(...scores.map(s => s.overall)) - Math.min(...scores.map(s => s.overall));
    insights.push(`Security score variation spans ${scoreRange} points, indicating ${scoreRange > 30 ? 'significant' : 'moderate'} security consistency opportunities`);

    return insights;
  }

  private generateComparisonRecommendations(distribution: any, averageScore: number): string[] {
    const recommendations: string[] = [];
    
    if (distribution.poor > 0) {
      recommendations.push('Prioritize immediate security improvements for low-scoring credentials');
    }
    
    if (averageScore < 80) {
      recommendations.push('Implement organization-wide security standard to raise average score');
    }
    
    if (distribution.excellent < distribution.good + distribution.fair) {
      recommendations.push('Focus on elevating good performers to excellent status');
    }

    return recommendations;
  }

  private generateExecutiveSummary(trustScore: TrustScore, businessFocused: boolean): string {
    const scoreLevel = trustScore.overall >= 90 ? 'Excellent' :
                     trustScore.overall >= 80 ? 'Good' :
                     trustScore.overall >= 70 ? 'Fair' :
                     trustScore.overall >= 60 ? 'Poor' : 'Critical';

    const trendText = trustScore.trend === 'improving' ? 'improving' :
                     trustScore.trend === 'declining' ? 'declining' : 'stable';

    if (businessFocused) {
      return `Your organization maintains a ${scoreLevel.toLowerCase()} security trust score of ${trustScore.overall}/100, which is ${trustScore.benchmarkComparison.peerComparison.replace('_', ' ')} compared to industry peers. The security posture is ${trendText}, indicating ${trustScore.businessImpact.competitiveAdvantage.toLowerCase()}. ${trustScore.businessImpact.riskExposure === 'low' ? 'Low business risk exposure provides strong foundation for growth.' : 'Elevated risk exposure requires strategic security investment to protect business value.'}`;
    } else {
      return `Security trust score: ${trustScore.overall}/100 (${scoreLevel}). Trend: ${trendText}. ${trustScore.recommendations.length} recommendations for improvement. Risk exposure: ${trustScore.businessImpact.riskExposure}.`;
    }
  }

  private generateDetailedAnalysis(trustScore: TrustScore): string {
    let analysis = `Comprehensive trust score analysis reveals:\n\n`;
    
    analysis += `Overall Performance: ${trustScore.overall}/100\n`;
    analysis += `Industry Benchmark: ${trustScore.benchmarkComparison.industryAverage}/100\n`;
    analysis += `Best Practice Gap: ${trustScore.benchmarkComparison.bestPracticeGap} points\n\n`;
    
    analysis += `Component Breakdown:\n`;
    for (const component of trustScore.components) {
      analysis += `- ${component.component.replace('_', ' ').toUpperCase()}: ${component.score}/100 (${component.status})\n`;
    }
    
    return analysis;
  }

  private generateKeyFindings(trustScore: TrustScore): string[] {
    const findings: string[] = [];
    
    findings.push(`Overall trust score: ${trustScore.overall}/100`);
    findings.push(`Performance trend: ${trustScore.trend}`);
    findings.push(`Industry position: ${trustScore.benchmarkComparison.competitivePosition}`);
    findings.push(`Risk exposure: ${trustScore.businessImpact.riskExposure}`);
    
    // Component findings
    const weakestComponent = trustScore.components.reduce((lowest, comp) =>
      comp.score < lowest.score ? comp : lowest
    );
    findings.push(`Weakest area: ${weakestComponent.component.replace('_', ' ')} (${weakestComponent.score}/100)`);
    
    const strongestComponent = trustScore.components.reduce((highest, comp) =>
      comp.score > highest.score ? comp : highest
    );
    findings.push(`Strongest area: ${strongestComponent.component.replace('_', ' ')} (${strongestComponent.score}/100)`);
    
    return findings;
  }

  private generateActionItems(trustScore: TrustScore): string[] {
    return trustScore.recommendations
      .filter(r => r.priority === 'critical' || r.priority === 'high')
      .slice(0, 5)
      .map(r => `${r.priority.toUpperCase()}: ${r.title} (${r.timeline})`);
  }

  private generateBusinessImplications(trustScore: TrustScore): string[] {
    return [
      `Customer trust level: ${trustScore.businessImpact.clientTrustLevel}`,
      `Business continuity risk: ${trustScore.businessImpact.businessContinuityRisk}`,
      `Regulatory compliance: ${trustScore.businessImpact.regulatoryStanding}`,
      `Competitive position: ${trustScore.businessImpact.competitiveAdvantage}`,
      `Insurance impact: ${trustScore.businessImpact.insurancePremiumImpact}`
    ];
  }

  private generateExportData(trustScore: TrustScore, options: any): any {
    return {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        includeRecommendations: options.includeRecommendations,
        includeHistory: options.includeHistory,
        includeBenchmarks: options.includeBenchmarks
      },
      trustScore: {
        overall: trustScore.overall,
        components: trustScore.components,
        trend: trustScore.trend,
        lastCalculated: trustScore.lastCalculated
      },
      benchmarks: options.includeBenchmarks ? trustScore.benchmarkComparison : undefined,
      recommendations: options.includeRecommendations ? trustScore.recommendations : undefined,
      history: options.includeHistory ? trustScore.historicalData : undefined,
      businessImpact: trustScore.businessImpact
    };
  }
}

// Export singleton instance
export const trustScoreService = new TrustScoreService();