export interface TemplateBuilderState {
  metadata: TemplateMetadata;
  parameters: ParameterStep[];
  workflow: WorkflowState;
  output: TemplateOutput;
}

export interface TemplateMetadata {
  name: string;
  title: string;
  description?: string;
  tags?: string[];
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
}

export interface ParameterStep {
  id: string;
  title: string;
  description?: string;
  properties: Record<string, FieldDefinition>;
  required: string[];
  dependencies?: Record<string, any>;
}

export interface FieldDefinition {
  title: string;
  type: string; // JSON Schema type
  description?: string;
  default?: any;
  enum?: any[];
  enumNames?: string[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  pattern?: string;
  format?: string;
  items?: FieldDefinition;
  properties?: Record<string, FieldDefinition>;
  uiField?: string; // Custom field extension name
  uiOptions?: Record<string, any>;
  uiWidget?: string;
  uiHelp?: string;
  uiPlaceholder?: string;
  uiAutofocus?: boolean;
  uiDisabled?: boolean;
  uiReadonly?: boolean;
}

export interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNode {
  id: string;
  type: 'action' | 'start' | 'parameter' | 'parameter-group' | 'output' | 'output-group';
  position: { x: number; y: number };
  data: ActionNodeData | StartNodeData | ParameterNodeData | ParameterGroupNodeData | OutputNodeData | OutputGroupNodeData;
}

export interface StartNodeData {
  type: 'start';
  label: string;
}

export interface ActionNodeData {
  type: 'action';
  actionId: string;
  name: string;
  inputs: Record<string, any>;
  outputs?: Record<string, any>;
  if?: string; // Conditional execution
  layoutDirection?: 'horizontal' | 'vertical';
}

export interface ParameterNodeData {
  type: 'parameter';
  paramName: string;
  paramTitle: string;
  usageCount: number;
}

export interface ParameterGroupNodeData {
  type: 'parameter-group';
  parameters: Array<{
    name: string;
    title: string;
    usageCount: number;
  }>;
  totalUsageCount: number;
  layoutDirection?: 'horizontal' | 'vertical';
}

export interface OutputNodeData {
  type: 'output';
  stepId: string;
  stepName: string;
  outputKeys: string[];
  usageCount: number;
}

export interface OutputGroupNodeData {
  type: 'output-group';
  outputs: Array<{
    title: string;
    url?: string;
    stepRefs: string[];
  }>;
  layoutDirection?: 'horizontal' | 'vertical';
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  label?: string;
  style?: {
    stroke?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  };
}

export interface TemplateOutput {
  links?: OutputLink[];
  text?: OutputText[];
}

export interface OutputLink {
  title?: string;
  url?: string;
  icon?: string;
  entityRef?: string;
}

export interface OutputText {
  title?: string;
  content?: string;
}

export interface TemplateAction {
  id: string;
  name: string;
  action: string;
  input: Record<string, any>;
  if?: string;
}
