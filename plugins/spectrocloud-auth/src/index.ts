/**
 * SpectroCloud authentication frontend plugin for Backstage.
 *
 * @packageDocumentation
 */

// Export the API reference and interface for consumers
export { spectroCloudAuthApiRef } from './api';
export type { SpectroCloudAuthApi } from './api';

// Export the plugin and its extensions
export {
  spectroCloudAuthPlugin,
  spectroCloudAuthPlugin as default,
  spectroCloudAuthApi,
} from './plugin';
