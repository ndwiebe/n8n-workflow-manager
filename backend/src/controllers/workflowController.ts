import { Request, Response } from 'express';
import { RequestWithUser, WorkflowModule, WorkflowConfiguration, ApiResponse } from '../types';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import * as workflowService from '../services/workflowService';

export const getWorkflowModules = async (req: Request, res: Response) => {
  try {
    const { category, active } = req.query;
    const modules = await workflowService.getAllWorkflowModules({
      category: category as string,
      active: active === 'true'
    });

    const response: ApiResponse<WorkflowModule[]> = {
      success: true,
      data: modules,
      meta: {
        total: modules.length
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching workflow modules:', error);
    throw createError('Failed to fetch workflow modules', 500);
  }
};

export const createWorkflowModule = async (req: RequestWithUser, res: Response) => {
  try {
    const moduleData = req.body;
    const newModule = await workflowService.createWorkflowModule(moduleData);

    logger.info(`Workflow module created: ${newModule.id}`, { 
      adminId: req.user?.id,
      moduleName: newModule.name 
    });

    const response: ApiResponse<WorkflowModule> = {
      success: true,
      data: newModule,
      message: 'Workflow module created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating workflow module:', error);
    throw createError('Failed to create workflow module', 500);
  }
};

export const updateWorkflowModule = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedModule = await workflowService.updateWorkflowModule(id, updates);
    
    if (!updatedModule) {
      throw createError('Workflow module not found', 404);
    }

    logger.info(`Workflow module updated: ${id}`, { 
      adminId: req.user?.id,
      updates: Object.keys(updates)
    });

    const response: ApiResponse<WorkflowModule> = {
      success: true,
      data: updatedModule,
      message: 'Workflow module updated successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Error updating workflow module:', error);
    throw error;
  }
};

export const deleteWorkflowModule = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    
    const deleted = await workflowService.deleteWorkflowModule(id);
    
    if (!deleted) {
      throw createError('Workflow module not found', 404);
    }

    logger.info(`Workflow module deleted: ${id}`, { adminId: req.user?.id });

    const response: ApiResponse = {
      success: true,
      message: 'Workflow module deleted successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Error deleting workflow module:', error);
    throw error;
  }
};

export const duplicateWorkflowModule = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    
    const duplicatedModule = await workflowService.duplicateWorkflowModule(id);
    
    if (!duplicatedModule) {
      throw createError('Workflow module not found', 404);
    }

    logger.info(`Workflow module duplicated: ${id} -> ${duplicatedModule.id}`, { 
      adminId: req.user?.id 
    });

    const response: ApiResponse<WorkflowModule> = {
      success: true,
      data: duplicatedModule,
      message: 'Workflow module duplicated successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error duplicating workflow module:', error);
    throw error;
  }
};

export const getUserConfigurations = async (req: RequestWithUser, res: Response) => {
  try {
    const userId = (req.query.userId as string) || req.user?.id;
    
    if (!userId) {
      throw createError('User ID required', 400);
    }

    const configurations = await workflowService.getUserConfigurations(userId);

    const response: ApiResponse<WorkflowConfiguration[]> = {
      success: true,
      data: configurations,
      meta: {
        total: configurations.length
      }
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching user configurations:', error);
    throw error;
  }
};

export const createConfiguration = async (req: RequestWithUser, res: Response) => {
  try {
    const { workflowId, credentials } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw createError('Authentication required', 401);
    }

    const configuration = await workflowService.createConfiguration({
      workflowId,
      userId,
      credentials
    });

    logger.info(`Configuration created: ${configuration.id}`, { 
      userId,
      workflowId 
    });

    const response: ApiResponse<WorkflowConfiguration> = {
      success: true,
      data: configuration,
      message: 'Configuration created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    logger.error('Error creating configuration:', error);
    throw error;
  }
};

export const updateConfiguration = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user?.id;

    const updatedConfiguration = await workflowService.updateConfiguration(id, updates, userId);
    
    if (!updatedConfiguration) {
      throw createError('Configuration not found or access denied', 404);
    }

    logger.info(`Configuration updated: ${id}`, { userId });

    const response: ApiResponse<WorkflowConfiguration> = {
      success: true,
      data: updatedConfiguration,
      message: 'Configuration updated successfully'
    };

    res.json(response);
  } catch (error) {
    logger.error('Error updating configuration:', error);
    throw error;
  }
};

export const activateWorkflow = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    const userId = req.user?.id;

    const updatedConfiguration = await workflowService.activateWorkflow(id, enabled, userId);
    
    if (!updatedConfiguration) {
      throw createError('Configuration not found or access denied', 404);
    }

    logger.info(`Workflow ${enabled ? 'activated' : 'deactivated'}: ${id}`, { userId });

    const response: ApiResponse<WorkflowConfiguration> = {
      success: true,
      data: updatedConfiguration,
      message: `Workflow ${enabled ? 'scheduled for activation' : 'deactivated'} successfully`
    };

    res.json(response);
  } catch (error) {
    logger.error('Error activating workflow:', error);
    throw error;
  }
};

export const validateCredentials = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { credentials } = req.body;

    const isValid = await workflowService.validateWorkflowCredentials(id, credentials);

    const response: ApiResponse<{ valid: boolean }> = {
      success: true,
      data: { valid: isValid },
      message: isValid ? 'Credentials are valid' : 'Invalid credentials'
    };

    res.json(response);
  } catch (error) {
    logger.error('Error validating credentials:', error);
    throw error;
  }
};