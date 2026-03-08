export interface Config {
    /**
    * AI Rules plugin configuration
    * NOTE: Visibility applies to only this field
    * @visibility frontend
    */
    aiRules?: {
      /**
      * Allowed rule types to search for in repositories.
      * Supported values: "cursor", "copilot", "cline", "claude-code",
      * "windsurf", "roo-code", "codex", "gemini", "amazon-q", "continue", "aider"
      * Defaults to all supported types if not specified.
      * @visibility frontend
      */
      allowedRuleTypes: string[];
      /**
      * Default rule types to be pre-selected when the component loads.
      * If not provided, defaults to empty array (no rules pre-selected).
      * If empty array, no rule types are pre-selected.
      * If specific array, those rule types are pre-selected.
      * @visibility frontend
      */
      defaultRuleTypes?: string[];
    }
  }
