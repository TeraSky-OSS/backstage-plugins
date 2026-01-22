export interface Config {
  /**
  * ScaleOps configuration
  * @visibility frontend
  */
  scaleops?: {
    /**
    * ScaleOps base URL (used for dashboard links)
    * @visibility frontend
    */
    baseUrl: string;
    /**
    * Currency prefix for cost display
    * @visibility frontend
    */
    currencyPrefix?: string;
    /**
    * Whether to show links to ScaleOps dashboard
    * @visibility frontend
    */
    linkToDashboard?: boolean;
  }
}  