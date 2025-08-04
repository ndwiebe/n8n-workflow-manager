import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { logger } from '../utils/logger';
import { templateLoader } from './templateLoader';
import { secretsManager } from './secretsManager';
import { WorkflowConfiguration } from '../types';

export type ProvisioningStatus = 
  | 'pending'
  | 'validating'
  | 'provisioning'
  | 'configuring'
  | 'testing'
  | 'ready'
  | 'active'
  | 'failed'
  | 'scheduled';

export interface ProvisioningJob {
  id: string;
  userId: string;
  workflowId: string;
  templateId: string;
  status: ProvisioningStatus;
  configuration: Record<string, any>;
  n8nInstanceId?: string;
  webhookUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  scheduledActivation?: Date;
  completedAt?: Date;
  errorMessage?: string;
  provisioningSteps: ProvisioningStep[];
}

export interface ProvisioningStep {
  id: string;
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface ProvisioningResult {
  success: boolean;
  jobId: string;
  status: ProvisioningStatus;
  message: string;
  estimatedCompletionTime?: Date;
  webhookUrl?: string;
}

export class ProvisioningService {
  private jobs: Map<string, ProvisioningJob> = new Map();
  private processingQueue: string[] = [];
  private isProcessing = false;
  private maxConcurrentJobs = 3;
  private currentJobs = 0;

  constructor() {
    this.startBackgroundProcessor();
    this.startScheduledActivationProcessor();
    logger.info('ProvisioningService initialized');
  }

  /**
   * Start a new provisioning job
   */
  public async startProvisioning(
    userId: string,
    workflowId: string,
    templateId: string,
    configuration: Record<string, any>
  ): Promise<ProvisioningResult> {
    try {
      // Validate template exists
      const template = templateLoader.getTemplateById(templateId);
      if (!template) {
        return {
          success: false,
          jobId: '',
          status: 'failed',
          message: 'Template not found'
        };
      }

      // Validate configuration
      const validation = templateLoader.validateConfiguration(templateId, configuration);
      if (!validation.valid) {
        return {
          success: false,
          jobId: '',
          status: 'failed',
          message: `Configuration validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Create provisioning job
      const jobId = uuidv4();
      const job: ProvisioningJob = {
        id: jobId,
        userId,
        workflowId,
        templateId,
        status: 'pending',
        configuration,
        createdAt: new Date(),
        updatedAt: new Date(),
        provisioningSteps: this.createProvisioningSteps(template.provisioning.dependencies)
      };

      this.jobs.set(jobId, job);
      this.processingQueue.push(jobId);

      // Store credentials securely
      await this.storeCredentials(userId, workflowId, configuration);

      logger.info(`Provisioning job created: ${jobId} for user ${userId}, workflow ${workflowId}`);

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }

      return {
        success: true,
        jobId,
        status: 'pending',
        message: 'Provisioning job started',
        estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      };
    } catch (error) {
      logger.error('Failed to start provisioning:', error);
      return {
        success: false,
        jobId: '',
        status: 'failed',
        message: 'Failed to start provisioning'
      };
    }
  }

  /**
   * Get provisioning job status
   */
  public getJobStatus(jobId: string): ProvisioningJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs for a user
   */
  public getUserJobs(userId: string): ProvisioningJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get jobs by status
   */
  public getJobsByStatus(status: ProvisioningStatus): ProvisioningJob[] {
    return Array.from(this.jobs.values())
      .filter(job => job.status === status);
  }

  /**
   * Cancel a provisioning job
   */
  public async cancelJob(jobId: string, userId: string): Promise<boolean> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        logger.warn(`Job not found for cancellation: ${jobId}`);
        return false;
      }

      // Verify ownership
      if (job.userId !== userId) {
        logger.warn(`Unauthorized cancellation attempt for job ${jobId} by user ${userId}`);
        return false;
      }

      // Can only cancel pending or in-progress jobs
      if (!['pending', 'validating', 'provisioning', 'configuring'].includes(job.status)) {
        logger.warn(`Cannot cancel job ${jobId} with status ${job.status}`);
        return false;
      }

      // Remove from queue if pending
      const queueIndex = this.processingQueue.indexOf(jobId);
      if (queueIndex > -1) {
        this.processingQueue.splice(queueIndex, 1);
      }

      // Update job status
      job.status = 'failed';
      job.errorMessage = 'Cancelled by user';
      job.updatedAt = new Date();

      logger.info(`Job cancelled: ${jobId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to cancel job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Schedule workflow activation
   */
  public async scheduleActivation(
    jobId: string,
    userId: string,
    activationDate: Date
  ): Promise<boolean> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        logger.warn(`Job not found for scheduling: ${jobId}`);
        return false;
      }

      // Verify ownership
      if (job.userId !== userId) {
        logger.warn(`Unauthorized scheduling attempt for job ${jobId} by user ${userId}`);
        return false;
      }

      // Can only schedule ready jobs
      if (job.status !== 'ready') {
        logger.warn(`Cannot schedule job ${jobId} with status ${job.status}`);
        return false;
      }

      job.scheduledActivation = activationDate;
      job.status = 'scheduled';
      job.updatedAt = new Date();

      logger.info(`Job scheduled for activation: ${jobId} at ${activationDate}`);
      return true;
    } catch (error) {
      logger.error(`Failed to schedule job ${jobId}:`, error);
      return false;
    }
  }

  /**
   * Process the provisioning queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    logger.info('Starting provisioning queue processing');

    while (this.processingQueue.length > 0 && this.currentJobs < this.maxConcurrentJobs) {
      const jobId = this.processingQueue.shift();
      if (jobId) {
        this.currentJobs++;
        this.processJob(jobId).finally(() => {
          this.currentJobs--;
        });
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process a single provisioning job
   */
  private async processJob(jobId: string): Promise<void> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) {
        logger.error(`Job not found: ${jobId}`);
        return;
      }

      logger.info(`Processing job: ${jobId}`);

      // Step 1: Validation
      await this.updateJobStatus(jobId, 'validating');
      await this.executeStep(job, 'validation');
      await this.delay(1000); // Simulate validation time

      // Step 2: Provisioning
      await this.updateJobStatus(jobId, 'provisioning');
      await this.executeStep(job, 'provisioning');
      await this.delay(2000); // Simulate provisioning time

      // Step 3: Configuration
      await this.updateJobStatus(jobId, 'configuring');
      await this.executeStep(job, 'configuration');
      await this.delay(1000); // Simulate configuration time

      // Step 4: Testing
      await this.updateJobStatus(jobId, 'testing');
      await this.executeStep(job, 'testing');
      await this.delay(1000); // Simulate testing time

      // Step 5: Ready
      await this.updateJobStatus(jobId, 'ready');
      await this.executeStep(job, 'completion');

      job.completedAt = new Date();
      job.webhookUrl = `https://api.n8n-manager.com/webhook/${jobId}`;

      logger.info(`Job completed successfully: ${jobId}`);

      // Simulate webhook notification
      await this.simulateWebhookNotification(job);

    } catch (error) {
      logger.error(`Job failed: ${jobId}`, error);
      await this.updateJobStatus(jobId, 'failed');
      const job = this.jobs.get(jobId);
      if (job) {
        job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      }
    }
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: ProvisioningStatus): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
      job.updatedAt = new Date();
      logger.info(`Job ${jobId} status updated to: ${status}`);
    }
  }

  /**
   * Execute a provisioning step
   */
  private async executeStep(job: ProvisioningJob, stepName: string): Promise<void> {
    const step = job.provisioningSteps.find(s => s.name === stepName);
    if (!step) return;

    step.status = 'in_progress';
    step.startedAt = new Date();

    try {
      // Simulate step execution
      await this.delay(500);
      
      step.status = 'completed';
      step.completedAt = new Date();
      
      logger.info(`Step completed: ${stepName} for job ${job.id}`);
    } catch (error) {
      step.status = 'failed';
      step.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  /**
   * Create provisioning steps based on template dependencies
   */
  private createProvisioningSteps(dependencies: string[]): ProvisioningStep[] {
    const baseSteps = [
      { name: 'validation', description: 'Validate configuration and credentials' },
      { name: 'provisioning', description: 'Create n8n workflow instance' },
      { name: 'configuration', description: 'Configure workflow with user settings' },
      { name: 'testing', description: 'Test workflow functionality' },
      { name: 'completion', description: 'Finalize and activate workflow' }
    ];

    return baseSteps.map(step => ({
      id: uuidv4(),
      name: step.name,
      status: 'pending' as const,
      metadata: { description: step.description, dependencies }
    }));
  }

  /**
   * Store credentials securely
   */
  private async storeCredentials(
    userId: string,
    workflowId: string,
    configuration: Record<string, any>
  ): Promise<void> {
    try {
      // Filter out non-credential fields (assuming credentials are password/token fields)
      const credentials: Record<string, string> = {};
      
      Object.entries(configuration).forEach(([key, value]) => {
        if (typeof value === 'string' && 
            (key.toLowerCase().includes('password') || 
             key.toLowerCase().includes('token') || 
             key.toLowerCase().includes('key') ||
             key.toLowerCase().includes('secret'))) {
          credentials[key] = value;
        }
      });

      if (Object.keys(credentials).length > 0) {
        await secretsManager.storeSecrets(userId, workflowId, credentials, {
          type: 'credential',
          description: 'Workflow configuration credentials'
        });
      }
    } catch (error) {
      logger.error('Failed to store credentials:', error);
      throw error;
    }
  }

  /**
   * Simulate webhook notification
   */
  private async simulateWebhookNotification(job: ProvisioningJob): Promise<void> {
    try {
      // In a real implementation, this would call the frontend webhook endpoint
      const webhookPayload = {
        jobId: job.id,
        userId: job.userId,
        workflowId: job.workflowId,
        status: job.status,
        timestamp: new Date().toISOString(),
        webhookUrl: job.webhookUrl
      };

      logger.info(`Webhook notification sent for job ${job.id}:`, webhookPayload);
      
      // Simulate webhook delay
      await this.delay(100);
    } catch (error) {
      logger.error(`Failed to send webhook notification for job ${job.id}:`, error);
    }
  }

  /**
   * Start background processor for scheduled activations
   */
  private startScheduledActivationProcessor(): void {
    // Run every minute to check for scheduled activations
    cron.schedule('* * * * *', async () => {
      try {
        const now = new Date();
        const scheduledJobs = this.getJobsByStatus('scheduled')
          .filter(job => job.scheduledActivation && job.scheduledActivation <= now);

        for (const job of scheduledJobs) {
          await this.activateWorkflow(job.id);
        }
      } catch (error) {
        logger.error('Failed to process scheduled activations:', error);
      }
    });

    logger.info('Scheduled activation processor started');
  }

  /**
   * Start background processor for queue processing
   */
  private startBackgroundProcessor(): void {
    // Process queue every 10 seconds
    setInterval(() => {
      this.processQueue();
    }, 10000);

    logger.info('Background queue processor started');
  }

  /**
   * Activate a scheduled workflow
   */
  private async activateWorkflow(jobId: string): Promise<void> {
    try {
      const job = this.jobs.get(jobId);
      if (!job) return;

      job.status = 'active';
      job.updatedAt = new Date();

      logger.info(`Workflow activated: ${jobId}`);

      // Simulate activation webhook
      await this.simulateWebhookNotification(job);
    } catch (error) {
      logger.error(`Failed to activate workflow ${jobId}:`, error);
    }
  }

  /**
   * Get provisioning statistics
   */
  public getProvisioningStats(): {
    totalJobs: number;
    byStatus: Record<ProvisioningStatus, number>;
    byUser: Record<string, number>;
    averageCompletionTime: number;
    successRate: number;
  } {
    const jobs = Array.from(this.jobs.values());
    const byStatus: Record<ProvisioningStatus, number> = {
      pending: 0,
      validating: 0,
      provisioning: 0,
      configuring: 0,
      testing: 0,
      ready: 0,
      active: 0,
      failed: 0,
      scheduled: 0
    };
    const byUser: Record<string, number> = {};

    let totalCompletionTime = 0;
    let completedJobs = 0;

    jobs.forEach(job => {
      byStatus[job.status]++;
      byUser[job.userId] = (byUser[job.userId] || 0) + 1;

      if (job.completedAt) {
        totalCompletionTime += job.completedAt.getTime() - job.createdAt.getTime();
        completedJobs++;
      }
    });

    const successfulJobs = byStatus.ready + byStatus.active + byStatus.scheduled;
    const successRate = jobs.length > 0 ? (successfulJobs / jobs.length) * 100 : 0;
    const averageCompletionTime = completedJobs > 0 ? totalCompletionTime / completedJobs : 0;

    return {
      totalJobs: jobs.length,
      byStatus,
      byUser,
      averageCompletionTime,
      successRate
    };
  }

  /**
   * Cleanup old jobs
   */
  public cleanupOldJobs(olderThanDays: number = 30): number {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const oldJobs = Array.from(this.jobs.entries())
      .filter(([_, job]) => job.createdAt < cutoffDate);

    let cleanedCount = 0;
    oldJobs.forEach(([jobId, _]) => {
      this.jobs.delete(jobId);
      cleanedCount++;
    });

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old provisioning jobs`);
    }

    return cleanedCount;
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const provisioningService = new ProvisioningService();