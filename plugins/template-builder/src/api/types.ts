export interface ScaffolderAction {
  id: string;
  description?: string;
  schema?: {
    input?: any;
    output?: any;
  };
}

export interface FieldType {
  name: string;
  displayName?: string;
  description?: string;
  schema?: any;
  builtIn?: boolean;
}

export interface FieldExtension {
  name: string;
  displayName?: string;
  description?: string;
  schema?: any;
}

export interface ValidationError {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
