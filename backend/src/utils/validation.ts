/**
 * Common validation utilities and middleware
 * Provides reusable validation schemas and error handling
 */

import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Validation failed:', { 
      errors: errors.array(),
      url: req.url,
      method: req.method,
      ip: req.ip
    });
    
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      message: 'Invalid input parameters',
      details: errors.array().map(error => ({
        field: 'param' in error ? error.param : 'unknown',
        message: error.msg,
        value: 'value' in error ? error.value : undefined
      }))
    });
  }
  next();
};

/**
 * Common validation chains
 */
export const validations = {
  // ID validations
  clientId: param('clientId').isString().isLength({ min: 1, max: 100 }).trim().escape(),
  workflowId: param('workflowId').isString().isLength({ min: 1, max: 100 }).trim().escape(),
  templateId: param('templateId').isString().isLength({ min: 1, max: 100 }).trim().escape(),
  jobId: param('jobId').isUUID().withMessage('Job ID must be a valid UUID'),
  
  // Query parameter validations
  category: query('category').optional().isString().isLength({ min: 1, max: 50 }).trim().escape(),
  status: query('status').optional().isIn(['template', 'configuring', 'scheduled', 'active', 'paused', 'error']),
  includeInactive: query('includeInactive').optional().isBoolean(),
  priceRange: query('priceRange').optional().matches(/^\d+-\d+$/).withMessage('Price range must be in format "min-max"'),
  supportLevel: query('supportLevel').optional().isIn(['community', 'standard', 'premium', 'enterprise']),
  
  // Pagination
  limit: query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  offset: query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be 0 or greater'),
  
  // Search
  search: query('search').optional().isString().isLength({ min: 1, max: 200 }).trim(),
  
  // Business config validations
  businessName: body('businessName').isString().isLength({ min: 1, max: 100 }).trim().escape(),
  businessDescription: body('businessDescription').optional().isString().isLength({ max: 500 }).trim(),
  expectedMonthlySavings: body('expectedMonthlySavings').isFloat({ min: 0, max: 1000000 }),
  department: body('department').isString().isIn(['sales', 'marketing', 'operations', 'finance', 'hr', 'it', 'customer-service']),
  targetUsers: body('targetUsers').isArray({ min: 0, max: 50 }),
  'targetUsers.*': body('targetUsers.*').isString().isLength({ min: 1, max: 100 }).trim().escape(),
  
  // Action validations
  action: body('action').isString().isIn(['pause', 'resume', 'restart', 'test', 'configure']),
  options: body('options').optional().isObject(),
  
  // Date validations
  activationDate: body('activationDate').isISO8601().toDate(),
  
  // Configuration validations
  configuration: body('configuration').isObject(),
  businessConfig: body('businessConfig').optional().isObject()
};

/**
 * Validation middleware factories
 */
export const validateClientWorkflows = [
  validations.clientId,
  validations.category,
  validations.status,
  validations.includeInactive,
  handleValidationErrors
];

export const validateWorkflowAction = [
  validations.clientId,
  validations.workflowId,
  validations.action,
  validations.options,
  handleValidationErrors
];

export const validateDeployTemplate = [
  validations.clientId,
  validations.templateId,
  validations.businessName,
  validations.businessDescription,
  validations.expectedMonthlySavings,
  validations.department,
  validations.targetUsers,
  validations['targetUsers.*'],
  handleValidationErrors
];

export const validateGetWorkflow = [
  validations.clientId,
  validations.workflowId,
  handleValidationErrors
];

export const validateTemplateFilters = [
  validations.category,
  validations.priceRange,
  validations.supportLevel,
  validations.search,
  handleValidationErrors
];

/**
 * Sanitize and validate object for safe database operations
 */
export const sanitizeObject = (obj: any, allowedFields: string[]): any => {
  const sanitized: any = {};
  for (const field of allowedFields) {
    if (obj[field] !== undefined) {
      sanitized[field] = obj[field];
    }
  }
  return sanitized;
};

/**
 * Validate business configuration object
 */
export const validateBusinessConfig = (config: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!config.businessName || typeof config.businessName !== 'string' || config.businessName.length === 0) {
    errors.push('Business name is required');
  }
  
  if (config.expectedMonthlySavings && (typeof config.expectedMonthlySavings !== 'number' || config.expectedMonthlySavings < 0)) {
    errors.push('Expected monthly savings must be a positive number');
  }
  
  if (!config.department || !['sales', 'marketing', 'operations', 'finance', 'hr', 'it', 'customer-service'].includes(config.department)) {
    errors.push('Valid department is required');
  }
  
  if (config.targetUsers && (!Array.isArray(config.targetUsers) || config.targetUsers.length > 50)) {
    errors.push('Target users must be an array with maximum 50 entries');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Rate limiting validation
 */
export const validateRateLimit = (req: Request): boolean => {
  // Basic rate limiting check (can be enhanced with Redis)
  const userAgent = req.get('User-Agent') || '';
  const suspicious = [
    'bot', 'crawler', 'spider', 'scraper'
  ].some(term => userAgent.toLowerCase().includes(term));
  
  return !suspicious;
};

/**
 * Input size validation
 */
export const validateInputSize = (req: Request): { valid: boolean; error?: string } => {
  const contentLength = parseInt(req.get('content-length') || '0');
  const maxSize = 1024 * 1024; // 1MB
  
  if (contentLength > maxSize) {
    return {
      valid: false,
      error: 'Request payload too large'
    };
  }
  
  return { valid: true };
};

/**
 * SQL injection protection
 */
export const sanitizeForDatabase = (input: string): string => {
  if (typeof input !== 'string') return input;
  
  // Remove potentially dangerous SQL characters
  return input
    .replace(/['"\\]/g, '') // Remove quotes and backslashes
    .replace(/;/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comment start
    .replace(/\*\//g, '') // Remove multi-line comment end
    .trim();
};

/**
 * XSS protection
 */
export const sanitizeForHTML = (input: string): string => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};