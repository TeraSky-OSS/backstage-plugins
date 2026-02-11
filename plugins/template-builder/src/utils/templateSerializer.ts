import * as yaml from 'js-yaml';
import type {
  TemplateBuilderState,
  ParameterStep,
  FieldDefinition,
  ActionNodeData,
} from '../types';

interface TemplateYAML {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    title: string;
    description?: string;
    tags?: string[];
    labels?: Record<string, string>;
    annotations?: Record<string, string>;
  };
  spec: {
    owner?: string;
    type?: string;
    parameters: Array<{
      title: string;
      description?: string;
      required?: string[];
      properties: Record<string, any>;
      dependencies?: Record<string, any>;
    }>;
    steps: Array<{
      id: string;
      name: string;
      action: string;
      input: Record<string, any>;
      if?: string;
    }>;
    output?: {
      links?: Array<{
        title?: string;
        url?: string;
        icon?: string;
        entityRef?: string;
      }>;
      text?: Array<{
        title?: string;
        content?: string;
      }>;
    };
  };
}

function serializeFieldDefinition(field: FieldDefinition): Record<string, any> {
  const serialized: Record<string, any> = {
    title: field.title,
    type: field.type,
  };

  if (field.description) serialized.description = field.description;
  if (field.default !== undefined) serialized.default = field.default;
  if (field.enum) serialized.enum = field.enum;
  if (field.enumNames) serialized.enumNames = field.enumNames;
  if (field.minLength !== undefined) serialized.minLength = field.minLength;
  if (field.maxLength !== undefined) serialized.maxLength = field.maxLength;
  if (field.minimum !== undefined) serialized.minimum = field.minimum;
  if (field.maximum !== undefined) serialized.maximum = field.maximum;
  if (field.multipleOf !== undefined) serialized.multipleOf = field.multipleOf;
  if (field.pattern) serialized.pattern = field.pattern;
  if (field.format) serialized.format = field.format;
  if (field.items) serialized.items = serializeFieldDefinition(field.items);
  if (field.properties) {
    serialized.properties = Object.fromEntries(
      Object.entries(field.properties).map(([key, value]) => [
        key,
        serializeFieldDefinition(value),
      ])
    );
  }

  // UI-specific properties
  if (field.uiField) serialized['ui:field'] = field.uiField;
  if (field.uiOptions) serialized['ui:options'] = field.uiOptions;
  if (field.uiWidget) serialized['ui:widget'] = field.uiWidget;
  if (field.uiHelp) serialized['ui:help'] = field.uiHelp;
  if (field.uiPlaceholder) serialized['ui:placeholder'] = field.uiPlaceholder;
  if (field.uiAutofocus) serialized['ui:autofocus'] = field.uiAutofocus;
  if (field.uiDisabled) serialized['ui:disabled'] = field.uiDisabled;
  if (field.uiReadonly) serialized['ui:readonly'] = field.uiReadonly;

  return serialized;
}

function serializeParameterStep(step: ParameterStep) {
  return {
    title: step.title,
    ...(step.description && { description: step.description }),
    ...(step.required.length > 0 && { required: step.required }),
    properties: Object.fromEntries(
      Object.entries(step.properties).map(([key, value]) => [
        key,
        serializeFieldDefinition(value),
      ])
    ),
    ...(step.dependencies && { dependencies: step.dependencies }),
  };
}

export function stateToYAML(state: TemplateBuilderState): string {
  // Convert workflow nodes to steps
  const steps = state.workflow.nodes
    .filter(node => node.type === 'action' && node.data.type === 'action')
    .map(node => {
      const data = node.data as ActionNodeData;
      const step: any = {
        id: node.id,
        name: data.name,
        action: data.actionId,
      };
      
      // Only include input if it has properties
      if (data.inputs && Object.keys(data.inputs).length > 0) {
        step.input = data.inputs;
      }
      
      if (data.if) {
        step.if = data.if;
      }
      
      return step;
    });

  const templateYAML: TemplateYAML = {
    apiVersion: 'scaffolder.backstage.io/v1beta3',
    kind: 'Template',
    metadata: {
      name: state.metadata.name,
      title: state.metadata.title,
      ...(state.metadata.description && { description: state.metadata.description }),
      ...(state.metadata.tags && state.metadata.tags.length > 0 && { tags: state.metadata.tags }),
      ...(state.metadata.labels && { labels: state.metadata.labels }),
      ...(state.metadata.annotations && { annotations: state.metadata.annotations }),
    },
    spec: {
      owner: 'user:default/guest',
      type: 'service',
      parameters: state.parameters.map(serializeParameterStep),
      steps,
      ...(state.output && Object.keys(state.output).length > 0 && { output: state.output }),
    },
  };

  return yaml.dump(templateYAML, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
    sortKeys: false,
  });
}

function deserializeFieldDefinition(field: Record<string, any>): FieldDefinition {
  const deserialized: FieldDefinition = {
    title: field.title || '',
    type: field.type || 'string',
  };

  if (field.description) deserialized.description = field.description;
  if (field.default !== undefined) deserialized.default = field.default;
  if (field.enum) deserialized.enum = field.enum;
  if (field.enumNames) deserialized.enumNames = field.enumNames;
  if (field.minLength !== undefined) deserialized.minLength = field.minLength;
  if (field.maxLength !== undefined) deserialized.maxLength = field.maxLength;
  if (field.minimum !== undefined) deserialized.minimum = field.minimum;
  if (field.maximum !== undefined) deserialized.maximum = field.maximum;
  if (field.multipleOf !== undefined) deserialized.multipleOf = field.multipleOf;
  if (field.pattern) deserialized.pattern = field.pattern;
  if (field.format) deserialized.format = field.format;
  if (field.items) deserialized.items = deserializeFieldDefinition(field.items);
  if (field.properties) {
    deserialized.properties = Object.fromEntries(
      Object.entries(field.properties).map(([key, value]) => [
        key,
        deserializeFieldDefinition(value as Record<string, any>),
      ])
    );
  }

  // UI-specific properties
  if (field['ui:field']) deserialized.uiField = field['ui:field'];
  if (field['ui:options']) deserialized.uiOptions = field['ui:options'];
  if (field['ui:widget']) deserialized.uiWidget = field['ui:widget'];
  if (field['ui:help']) deserialized.uiHelp = field['ui:help'];
  if (field['ui:placeholder']) deserialized.uiPlaceholder = field['ui:placeholder'];
  if (field['ui:autofocus']) deserialized.uiAutofocus = field['ui:autofocus'];
  if (field['ui:disabled']) deserialized.uiDisabled = field['ui:disabled'];
  if (field['ui:readonly']) deserialized.uiReadonly = field['ui:readonly'];

  return deserialized;
}

export function yamlToState(yamlString: string): TemplateBuilderState {
  const parsed = yaml.load(yamlString) as TemplateYAML;

  // Validate basic structure
  if (parsed.apiVersion !== 'scaffolder.backstage.io/v1beta3') {
    throw new Error('Invalid template apiVersion');
  }
  if (parsed.kind !== 'Template') {
    throw new Error('Invalid template kind');
  }

  // Convert parameters
  const parameters: ParameterStep[] = (parsed.spec.parameters || []).map((param, index) => ({
    id: `step-${index + 1}`,
    title: param.title,
    description: param.description,
    properties: Object.fromEntries(
      Object.entries(param.properties || {}).map(([key, value]) => [
        key,
        deserializeFieldDefinition(value),
      ])
    ),
    required: param.required || [],
    dependencies: param.dependencies,
  }));

  // Convert steps to workflow nodes
  const actionNodes = (parsed.spec.steps || []).map((step, index) => ({
    id: step.id,
    type: 'action' as const,
    position: { x: 250, y: 150 + index * 100 },
    data: {
      type: 'action' as const,
      actionId: step.action,
      name: step.name,
      inputs: step.input || {},
      ...(step.if && { if: step.if }),
    },
  }));

  // Create edges connecting nodes sequentially
  const edges = actionNodes.map((node, index) => {
    const sourceId = index === 0 ? 'start' : actionNodes[index - 1].id;
    return {
      id: `e-${sourceId}-${node.id}`,
      source: sourceId,
      target: node.id,
    };
  });

  const state: TemplateBuilderState = {
    metadata: {
      name: parsed.metadata.name,
      title: parsed.metadata.title,
      description: parsed.metadata.description,
      tags: parsed.metadata.tags,
      labels: parsed.metadata.labels,
      annotations: parsed.metadata.annotations,
    },
    parameters: parameters.length > 0 ? parameters : [{
      id: 'step-1',
      title: 'Fill in some information',
      properties: {},
      required: [],
    }],
    workflow: {
      nodes: actionNodes,
      edges,
    },
    output: parsed.spec.output || { links: [] },
  };

  return state;
}
