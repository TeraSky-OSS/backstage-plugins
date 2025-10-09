export interface TerraformModuleReference {
  name: string;
  url: string;
  refs?: string[];
  description?: string;
  isRegistryModule?: boolean; // Flag to identify registry modules
  moduleURL?: string; // URL of the module
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