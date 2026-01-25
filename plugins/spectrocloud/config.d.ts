/**
 * Configuration schema for the SpectroCloud frontend plugin.
 * 
 * This defines the frontend-visible configuration options.
 */
export interface Config {
  /**
   * SpectroCloud configuration
   */
  spectrocloud?: {
    /**
     * Optional: Annotation prefix for SpectroCloud metadata (default: terasky.backstage.io)
     * @visibility frontend
     */
    annotationPrefix?: string;
    /**
     * Optional: Enable permission checks in the frontend (default: false)
     * When false, all UI elements are shown regardless of permissions.
     * When true, UI elements are hidden based on permission checks.
     * @visibility frontend
     */
    enablePermissions?: boolean;
  };
}

