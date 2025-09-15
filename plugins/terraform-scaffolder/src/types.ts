export interface TerraformModuleReference {
  name: string;
  url: string;
  ref?: string;
  description?: string;
}

export interface TerraformVariable {
  name: string;
  type: string;
  subtype?: string;
  description?: string;
  default?: any;
  required: boolean;
  sensitive?: boolean;
  originalDefinition?: string;
}