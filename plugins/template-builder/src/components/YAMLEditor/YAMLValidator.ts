import * as yaml from 'js-yaml';

export interface YAMLValidationError {
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning';
}

export function validateYAML(yamlString: string): YAMLValidationError[] {
  const errors: YAMLValidationError[] = [];

  // Basic YAML syntax validation
  try {
    const parsed = yaml.load(yamlString);
    
    if (!parsed || typeof parsed !== 'object') {
      errors.push({
        message: 'YAML must be a valid object',
        severity: 'error',
      });
      return errors;
    }

    // Template-specific validation
    const template = parsed as any;

    if (template.apiVersion !== 'scaffolder.backstage.io/v1beta3') {
      errors.push({
        message: 'Invalid apiVersion. Expected: scaffolder.backstage.io/v1beta3',
        severity: 'error',
      });
    }

    if (template.kind !== 'Template') {
      errors.push({
        message: 'Invalid kind. Expected: Template',
        severity: 'error',
      });
    }

    if (!template.metadata) {
      errors.push({
        message: 'Missing required field: metadata',
        severity: 'error',
      });
    } else {
      if (!template.metadata.name) {
        errors.push({
          message: 'Missing required field: metadata.name',
          severity: 'error',
        });
      }
      
      if (!template.metadata.title) {
        errors.push({
          message: 'Missing required field: metadata.title',
          severity: 'error',
        });
      }
    }

    if (!template.spec) {
      errors.push({
        message: 'Missing required field: spec',
        severity: 'error',
      });
    } else {
      if (!template.spec.parameters || !Array.isArray(template.spec.parameters)) {
        errors.push({
          message: 'spec.parameters must be an array',
          severity: 'warning',
        });
      }

      if (!template.spec.steps || !Array.isArray(template.spec.steps)) {
        errors.push({
          message: 'spec.steps must be an array',
          severity: 'error',
        });
      } else if (template.spec.steps.length === 0) {
        errors.push({
          message: 'At least one step is required',
          severity: 'error',
        });
      }
    }
  } catch (error) {
    if (error instanceof yaml.YAMLException) {
      errors.push({
        line: error.mark?.line,
        column: error.mark?.column,
        message: error.message,
        severity: 'error',
      });
    } else {
      errors.push({
        message: error instanceof Error ? error.message : 'Unknown YAML error',
        severity: 'error',
      });
    }
  }

  return errors;
}

export function getYAMLLineCount(yamlString: string): number {
  return yamlString.split('\n').length;
}
