/**
 * Configuration schema for the AI Rules backend plugin.
 * 
 * This plugin provides API endpoints for discovering and managing AI rules
 * (Cursor, Copilot, Cline, Claude Code) from source repositories.
 */
export interface Config {
  /**
   * AI Rules configuration
   */
  aiRules?: {
    /**
     * Enable or disable the plugin
     * @visibility frontend
     */
    enabled?: boolean;
    /**
     * Allowed rule types to search for in repositories
     * Defaults to ["cursor", "copilot", "cline", "claude-code"] if not specified
     * @visibility frontend
     */
    allowedRuleTypes?: string[];
    /**
     * Default rule types to be pre-selected when the component loads
     * If not provided, defaults to empty array (no rules pre-selected)
     * @visibility frontend
     */
    defaultRuleTypes?: string[];
  };
}
