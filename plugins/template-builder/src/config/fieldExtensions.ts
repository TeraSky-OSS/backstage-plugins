/**
 * Configure known field extensions for your Backstage instance.
 * 
 * This list is used as a fallback when auto-discovery fails or as an
 * additional source of field extensions.
 * 
 * Add any custom field extensions your organization has registered here.
 */
export const KNOWN_FIELD_EXTENSIONS: string[] = [
  // Built-in Backstage field extensions
  'EntityPicker',
  'EntityNamePicker',
  'OwnedEntityPicker',
  'EntityTagsPicker',
  'MultiEntityPicker',
  'OwnerPicker',
  'RepoUrlPicker',
  'RepoUrlSelector',
  'MyGroupsPicker',
  
  // Custom field extensions found in your templates:
  'SpringInitializer',
  'TerraformModule',
  
  // Add any additional custom field extensions below:
  // 'AwsAccountPicker',
  // 'AzureSubscriptionPicker',
  // 'GcpProjectPicker',
  // 'MyCompanyCustomPicker',
];

/**
 * Set to true to ONLY use the configured list above (disable auto-discovery).
 * Set to false to merge auto-discovered extensions with the configured list.
 */
export const DISABLE_AUTO_DISCOVERY = false;
