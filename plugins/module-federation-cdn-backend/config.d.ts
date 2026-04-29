/**
 * Configuration schema for the Module Federation CDN backend plugin.
 *
 * This plugin enables loading Backstage dynamic frontend plugins directly from
 * a CDN using Module Federation, without requiring files in the dynamic-plugins-root
 * directory. At startup it fetches each plugin's mf-manifest.json from the CDN,
 * writes minimal stub files to a temp directory, and injects virtual
 * FrontendDynamicPlugin entries so the dynamic features service serves them.
 */
export interface Config {
  /**
   * List of CDN-hosted module federation remotes to register at startup.
   * Each entry represents one dynamic frontend plugin whose assets are served
   * directly from a CDN rather than from the Backstage backend filesystem.
   */
  cdn?: Array<{
    /**
     * The npm package name of the plugin as it appears in its package.json.
     * Example: "@my-org/backstage-plugin-example"
     * @visibility backend
     */
    pluginName: string;
    /**
     * The CDN base URL where the plugin assets are hosted.
     * Must end with a trailing slash and point to the directory that contains
     * the mf-manifest.json file.
     * Example: "https://cdn.example.com/plugins/my-plugin/"
     * @visibility backend
     */
    publicPath: string;
  }>;
}
