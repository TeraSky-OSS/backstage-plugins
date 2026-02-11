import type { TemplateBuilderState } from '../types';
import type { ValidationError } from '../api/types';

export function validateTemplate(state: TemplateBuilderState): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate metadata
  if (!state.metadata.name || state.metadata.name.trim() === '') {
    errors.push({
      path: 'metadata.name',
      message: 'Template name is required',
      severity: 'error',
    });
  } else if (!/^[a-z0-9-]+$/.test(state.metadata.name)) {
    errors.push({
      path: 'metadata.name',
      message: 'Template name must contain only lowercase letters, numbers, and hyphens',
      severity: 'error',
    });
  }

  if (!state.metadata.title || state.metadata.title.trim() === '') {
    errors.push({
      path: 'metadata.title',
      message: 'Template title is required',
      severity: 'error',
    });
  }

  // Validate parameters
  if (!state.parameters || state.parameters.length === 0) {
    errors.push({
      path: 'spec.parameters',
      message: 'At least one parameter step is recommended',
      severity: 'warning',
    });
  } else {
    state.parameters.forEach((step, stepIndex) => {
      if (!step.title || step.title.trim() === '') {
        errors.push({
          path: `spec.parameters[${stepIndex}].title`,
          message: `Parameter step ${stepIndex + 1} must have a title`,
          severity: 'error',
        });
      }

      // Check for required fields that don't exist
      step.required.forEach(fieldName => {
        if (!step.properties[fieldName]) {
          errors.push({
            path: `spec.parameters[${stepIndex}].required`,
            message: `Required field "${fieldName}" is not defined in properties`,
            severity: 'error',
          });
        }
      });

      // Validate field definitions
      Object.entries(step.properties).forEach(([fieldName, field]) => {
        if (!field.title || field.title.trim() === '') {
          errors.push({
            path: `spec.parameters[${stepIndex}].properties.${fieldName}.title`,
            message: `Field "${fieldName}" must have a title`,
            severity: 'error',
          });
        }

        if (!field.type) {
          errors.push({
            path: `spec.parameters[${stepIndex}].properties.${fieldName}.type`,
            message: `Field "${fieldName}" must have a type`,
            severity: 'error',
          });
        }
      });
    });
  }

  // Validate workflow
  const actionNodes = state.workflow.nodes.filter(node => node.type === 'action');
  
  if (actionNodes.length === 0) {
    errors.push({
      path: 'spec.steps',
      message: 'At least one workflow step is required',
      severity: 'error',
    });
  } else {
    actionNodes.forEach((node, index) => {
      if (node.data.type === 'action') {
        const data = node.data;
        
        if (!data.actionId) {
          errors.push({
            path: `spec.steps[${index}].action`,
            message: `Step ${index + 1} must have an action ID`,
            severity: 'error',
          });
        }

        if (!data.name || data.name.trim() === '') {
          errors.push({
            path: `spec.steps[${index}].name`,
            message: `Step ${index + 1} must have a name`,
            severity: 'error',
          });
        }

        // Validate expressions
        if (data.inputs) {
          validateExpressions(data.inputs, `spec.steps[${index}].input`, errors, state);
        }

        if (data.if) {
          validateExpression(data.if, `spec.steps[${index}].if`, errors, state);
        }
      }
    });

    // Check for disconnected nodes
    const connectedNodeIds = new Set<string>();
    connectedNodeIds.add('start');
    
    state.workflow.edges.forEach(edge => {
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    });

    actionNodes.forEach((node, index) => {
      if (!connectedNodeIds.has(node.id)) {
        const nodeName = node.data.type === 'action' ? (node.data as any).name : 'Unknown';
        errors.push({
          path: `spec.steps[${index}]`,
          message: `Step "${nodeName}" is not connected to the workflow`,
          severity: 'warning',
        });
      }
    });
  }

  return errors;
}

function validateExpressions(
  obj: any,
  path: string,
  errors: ValidationError[],
  state: TemplateBuilderState
): void {
  if (typeof obj === 'string') {
    validateExpression(obj, path, errors, state);
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      validateExpressions(item, `${path}[${index}]`, errors, state);
    });
  } else if (obj && typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      validateExpressions(value, `${path}.${key}`, errors, state);
    });
  }
}

function validateExpression(
  expr: string,
  path: string,
  errors: ValidationError[],
  state: TemplateBuilderState
): void {
  // Match ${{ }} expressions
  const expressionRegex = /\$\{\{\s*([^}]+)\s*\}\}/g;
  let match;

  while ((match = expressionRegex.exec(expr)) !== null) {
    const expression = match[1].trim();
    
    // Check if it references parameters
    if (expression.startsWith('parameters.')) {
      const paramPath = expression.substring('parameters.'.length);
      const paramName = paramPath.split('.')[0];
      
      // Check if parameter exists
      const parameterExists = state.parameters.some(step =>
        Object.keys(step.properties).includes(paramName)
      );
      
      if (!parameterExists) {
        errors.push({
          path,
          message: `Expression references undefined parameter: ${paramName}`,
          severity: 'error',
        });
      }
    }
    
    // Check if it references steps
    if (expression.startsWith('steps.')) {
      const stepPath = expression.substring('steps.'.length);
      const stepId = stepPath.split('.')[0];
      
      // Check if step exists
      const stepExists = state.workflow.nodes.some(node => node.id === stepId);
      
      if (!stepExists) {
        errors.push({
          path,
          message: `Expression references undefined step: ${stepId}`,
          severity: 'error',
        });
      }
    }
  }

  // Check for unmatched braces
  const openBraces = (expr.match(/\$\{\{/g) || []).length;
  const closeBraces = (expr.match(/\}\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    errors.push({
      path,
      message: 'Expression has unmatched braces',
      severity: 'error',
    });
  }
}
