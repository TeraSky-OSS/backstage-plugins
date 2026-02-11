export interface Config {
  /** Configuration options for the template-builder plugin */
  templateBuilder?: {
    /**
     * Enable/disable the template builder plugin
     * @visibility frontend
     */
    enabled?: boolean;
  };
}
