export interface Config {
  /**
   * Configuration for the Terraform Scaffolder plugin
   * @visibility frontend
   */
  terraformScaffolder: {
    /**
     * Whether to use the proxy endpoint for GitHub raw content (needed for private repos)
     * @visibility frontend
     */
    useProxyForGitHub?: boolean;
    /**
     * List of Terraform module references that can be used for scaffolding
     * @visibility frontend
     */
    moduleReferences: Array<{
      /**
       * Display name for the module
       * @visibility frontend
       */
      name: string;
      /**
       * Git URL of the module
       * @visibility frontend
       */
      url: string;
      /**
       * Git references (tags) to use
       * @visibility frontend
       */
      refs: string[];
      /**
       * Description of the module
       * @visibility frontend
       */
      description?: string;
    }>;

    /**
     * Configuration for Terraform Registry integration
     * @visibility frontend
     */
    registryReferences?: {
      /**
       * List of Terraform Registry namespaces to fetch modules from
       * @visibility frontend
       */
      namespaces: string[];
      /**
       * Whether to fetch all available versions for each module
       * @visibility frontend
       */
      returnAllVersions?: boolean;
    };
  };
}