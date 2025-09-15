export interface Config {
  /**
   * Configuration for the Terraform Scaffolder plugin
   * @visibility frontend
   */
  terraformScaffolder: {
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
       * Git reference (branch, tag, or commit) to use
       * @visibility frontend
       */
      ref?: string;
      /**
       * Description of the module
       * @visibility frontend
       */
      description?: string;
    }>;
  };
}