import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { logger } from '../utils/logger';

// Zod schema for validating workflow templates
const FieldSchema = z.object({
  key: z.string(),
  name: z.string(),
  label: z.string(),
  type: z.enum(['text', 'email', 'password', 'number', 'select', 'checkbox', 'url']),
  required: z.boolean(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string()
  })).optional(),
  validation: z.object({
    pattern: z.string().optional(),
    minLength: z.number().optional(),
    maxLength: z.number().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    message: z.string().optional()
  }).optional()
});

const WorkflowTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  icon: z.string(),
  version: z.string(),
  author: z.string(),
  tags: z.array(z.string()),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedSetupTime: z.string(),
  monthlyPrice: z.number(),
  fields: z.array(FieldSchema),
  externalTools: z.array(z.string()),
  features: z.array(z.string()),
  requirements: z.record(z.any()),
  provisioning: z.object({
    type: z.string(),
    template: z.string(),
    estimatedProvisionTime: z.string(),
    dependencies: z.array(z.string())
  })
});

export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;
export type FieldDefinition = z.infer<typeof FieldSchema>;

export class TemplateLoader {
  private templatesPath: string;
  private templates: Map<string, WorkflowTemplate> = new Map();
  private lastLoadTime: Date = new Date(0);

  constructor(templatesPath?: string) {
    this.templatesPath = templatesPath || path.join(__dirname, '../../../data/workflow-templates');
    this.loadTemplates();
  }

  /**
   * Load all workflow templates from the templates directory
   */
  public loadTemplates(): void {
    try {
      if (!fs.existsSync(this.templatesPath)) {
        logger.warn(`Templates directory not found: ${this.templatesPath}`);
        return;
      }

      const files = fs.readdirSync(this.templatesPath)
        .filter(file => file.endsWith('.json'));

      this.templates.clear();
      
      for (const file of files) {
        try {
          const filePath = path.join(this.templatesPath, file);
          const fileContent = fs.readFileSync(filePath, 'utf-8');
          const templateData = JSON.parse(fileContent);
          
          // Validate template structure
          const validatedTemplate = WorkflowTemplateSchema.parse(templateData);
          
          this.templates.set(validatedTemplate.id, validatedTemplate);
          logger.info(`Loaded workflow template: ${validatedTemplate.id}`);
        } catch (error) {
          logger.error(`Failed to load template ${file}:`, error);
        }
      }

      this.lastLoadTime = new Date();
      logger.info(`Loaded ${this.templates.size} workflow templates`);
    } catch (error) {
      logger.error('Failed to load workflow templates:', error);
    }
  }

  /**
   * Get all available workflow templates
   */
  public getAllTemplates(): WorkflowTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get a specific workflow template by ID
   */
  public getTemplateById(id: string): WorkflowTemplate | null {
    return this.templates.get(id) || null;
  }

  /**
   * Get templates filtered by category
   */
  public getTemplatesByCategory(category: string): WorkflowTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.category.toLowerCase() === category.toLowerCase());
  }

  /**
   * Get templates filtered by difficulty level
   */
  public getTemplatesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): WorkflowTemplate[] {
    return Array.from(this.templates.values())
      .filter(template => template.difficulty === difficulty);
  }

  /**
   * Search templates by name, description, or tags
   */
  public searchTemplates(query: string): WorkflowTemplate[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.templates.values())
      .filter(template => 
        template.name.toLowerCase().includes(searchTerm) ||
        template.description.toLowerCase().includes(searchTerm) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
  }

  /**
   * Get template configuration schema for a specific template
   */
  public getTemplateSchema(templateId: string): FieldDefinition[] | null {
    const template = this.getTemplateById(templateId);
    return template ? template.fields : null;
  }

  /**
   * Validate user configuration against template schema
   */
  public validateConfiguration(templateId: string, configuration: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const template = this.getTemplateById(templateId);
    if (!template) {
      return { valid: false, errors: ['Template not found'] };
    }

    const errors: string[] = [];

    // Check required fields
    for (const field of template.fields) {
      if (field.required && !configuration[field.key]) {
        errors.push(`Field '${field.label}' is required`);
        continue;
      }

      const value = configuration[field.key];
      if (value === undefined || value === null) continue;

      // Validate field type
      if (!this.validateFieldType(field, value)) {
        errors.push(`Field '${field.label}' has invalid type`);
        continue;
      }

      // Validate field constraints
      if (field.validation) {
        const validationError = this.validateFieldConstraints(field, value);
        if (validationError) {
          errors.push(validationError);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate field type
   */
  private validateFieldType(field: FieldDefinition, value: any): boolean {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'password':
      case 'url':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'checkbox':
        return typeof value === 'boolean';
      case 'select':
        return typeof value === 'string' && 
               field.options?.some(option => option.value === value);
      default:
        return true;
    }
  }

  /**
   * Validate field constraints
   */
  private validateFieldConstraints(field: FieldDefinition, value: any): string | null {
    if (!field.validation) return null;

    const validation = field.validation;
    const fieldLabel = field.label;

    // Pattern validation
    if (validation.pattern && typeof value === 'string') {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return validation.message || `Field '${fieldLabel}' format is invalid`;
      }
    }

    // String length validation
    if (typeof value === 'string') {
      if (validation.minLength && value.length < validation.minLength) {
        return validation.message || `Field '${fieldLabel}' must be at least ${validation.minLength} characters`;
      }
      if (validation.maxLength && value.length > validation.maxLength) {
        return validation.message || `Field '${fieldLabel}' must be no more than ${validation.maxLength} characters`;
      }
    }

    // Number range validation
    if (typeof value === 'number') {
      if (validation.min !== undefined && value < validation.min) {
        return validation.message || `Field '${fieldLabel}' must be at least ${validation.min}`;
      }
      if (validation.max !== undefined && value > validation.max) {
        return validation.message || `Field '${fieldLabel}' must be no more than ${validation.max}`;
      }
    }

    return null;
  }

  /**
   * Get template statistics
   */
  public getTemplateStats(): {
    total: number;
    byCategory: Record<string, number>;
    byDifficulty: Record<string, number>;
    lastLoadTime: Date;
  } {
    const templates = Array.from(this.templates.values());
    
    const byCategory: Record<string, number> = {};
    const byDifficulty: Record<string, number> = {};

    templates.forEach(template => {
      byCategory[template.category] = (byCategory[template.category] || 0) + 1;
      byDifficulty[template.difficulty] = (byDifficulty[template.difficulty] || 0) + 1;
    });

    return {
      total: templates.length,
      byCategory,
      byDifficulty,
      lastLoadTime: this.lastLoadTime
    };
  }

  /**
   * Reload templates from disk
   */
  public reloadTemplates(): void {
    logger.info('Reloading workflow templates...');
    this.loadTemplates();
  }

  /**
   * Add a new template programmatically
   */
  public addTemplate(template: WorkflowTemplate): void {
    try {
      const validatedTemplate = WorkflowTemplateSchema.parse(template);
      this.templates.set(validatedTemplate.id, validatedTemplate);
      logger.info(`Added new workflow template: ${validatedTemplate.id}`);
    } catch (error) {
      logger.error('Failed to add template:', error);
      throw new Error('Invalid template structure');
    }
  }

  /**
   * Remove a template
   */
  public removeTemplate(templateId: string): boolean {
    const removed = this.templates.delete(templateId);
    if (removed) {
      logger.info(`Removed workflow template: ${templateId}`);
    }
    return removed;
  }
}

// Export singleton instance
export const templateLoader = new TemplateLoader();