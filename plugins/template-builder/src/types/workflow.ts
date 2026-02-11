import { Node, Edge } from '@xyflow/react';

export type WorkflowNodeType = Node<any>;
export type WorkflowEdgeType = Edge;

export interface NodePosition {
  x: number;
  y: number;
}

export interface ActionCategory {
  id: string;
  name: string;
  description?: string;
  actions: string[];
}

export interface AvailableAction {
  id: string;
  name: string;
  description?: string;
  category: string;
  schema?: {
    input?: ActionInputSchema;
    output?: ActionOutputSchema;
  };
}

export interface ActionInputSchema {
  type?: string;
  required?: string[];
  properties?: Record<string, PropertySchema>;
}

export interface ActionOutputSchema {
  type?: string;
  properties?: Record<string, PropertySchema>;
}

export interface PropertySchema {
  type: string | string[];
  title?: string;
  description?: string;
  default?: any;
  enum?: any[];
  items?: PropertySchema;
  properties?: Record<string, PropertySchema>;
  required?: string[];
}

export interface ConnectionValidation {
  valid: boolean;
  message?: string;
}

export interface DraggedAction {
  actionId: string;
  name: string;
  description?: string;
}
