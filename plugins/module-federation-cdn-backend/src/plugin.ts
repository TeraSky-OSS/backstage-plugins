import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import {
  dynamicPluginsServiceRef,
  dynamicPluginsFrontendServiceRef,
} from '@backstage/backend-dynamic-feature-service';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * moduleFederationCdnPlugin backend plugin
 *
 * Registers CDN-hosted module federation remotes with the Backstage dynamic
 * features service without placing any files in dynamic-plugins-root.
 *
 * For each entry in the `cdn` config array it:
 *   1. Fetches the mf-manifest.json from the CDN publicPath at startup.
 *   2. Writes minimal stub files (package.json + patched mf-manifest.json) to
 *      a runtime temp directory so the dynamic features router can serve them.
 *   3. Injects virtual FrontendDynamicPlugin entries into dynamicPluginsServiceRef
 *      by monkey-patching frontendPlugins() and getScannedPackage() before the
 *      dynamic features service startup hook runs.
 *
 * @public
 */
export const moduleFederationCdnPlugin = createBackendPlugin({
  pluginId: 'module-federation-cdn',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.rootLogger,
        dynamicPlugins: dynamicPluginsServiceRef,
        frontendRemotesServer: dynamicPluginsFrontendServiceRef,
      },
      async init({ config, logger, dynamicPlugins, frontendRemotesServer }) {
        const cdns = config.getOptionalConfigArray('cdn');
        if (!cdns?.length) {
          return;
        }

        const baseDir = join(tmpdir(), 'module-federation-cdn');

        type VirtualPlugin = {
          name: string;
          version: string;
          role: string;
          platform: 'web';
        };

        const virtualPlugins: VirtualPlugin[] = [];
        const scannedPackages = new Map<string, { location: URL; manifest: any }>();

        await Promise.all(
          cdns.map(async cdn => {
            const pluginName = cdn.getString('pluginName');
            const publicPath = cdn.getString('publicPath');
            const manifestUrl = `${publicPath}mf-manifest.json`;

            try {
              const resp = await fetch(manifestUrl);
              if (!resp.ok) {
                logger.error(
                  `module-federation-cdn: failed to fetch manifest for ${pluginName} from ${manifestUrl} (HTTP ${resp.status})`,
                );
                return;
              }
              const manifest = (await resp.json()) as any;

              // Bake the CDN publicPath directly into the manifest so the
              // browser fetches all JS chunks from the CDN, not from the backend.
              manifest.metaData.publicPath = publicPath;

              const version: string =
                manifest.metaData?.pluginVersion ?? '0.0.0';

              // Write minimal stub files to a temp directory so the dynamic
              // features service router can read the manifest from disk.
              const pluginTmpDir = join(baseDir, manifest.name);
              const distTmpDir = join(pluginTmpDir, 'dist');
              mkdirSync(distTmpDir, { recursive: true });

              writeFileSync(
                join(pluginTmpDir, 'package.json'),
                JSON.stringify({
                  name: pluginName,
                  version,
                  main: './dist/mf-manifest.json',
                  backstage: { role: 'frontend-plugin' },
                }),
              );
              writeFileSync(
                join(distTmpDir, 'mf-manifest.json'),
                JSON.stringify(manifest),
              );

              virtualPlugins.push({
                name: pluginName,
                version,
                role: 'frontend-plugin',
                platform: 'web',
              });

              scannedPackages.set(pluginName, {
                location: pathToFileURL(pluginTmpDir) as URL,
                manifest: {
                  name: pluginName,
                  version,
                  main: './dist/mf-manifest.json',
                  backstage: { role: 'frontend-plugin' },
                },
              });

              logger.info(
                `module-federation-cdn: registered CDN remote for ${pluginName} from ${publicPath}`,
              );
            } catch (err) {
              logger.error(
                `module-federation-cdn: unexpected error setting up ${pluginName}`,
                err as Error,
              );
            }
          }),
        );

        if (!virtualPlugins.length) {
          return;
        }

        // Monkey-patch the DynamicPluginManager so the dynamic features
        // service startup hook includes our virtual CDN plugins in the
        // /remotes list it builds and serves.
        const manager = dynamicPlugins as any;

        const originalFrontendPlugins =
          manager.frontendPlugins.bind(manager);
        manager.frontendPlugins = (options?: any) => [
          ...originalFrontendPlugins(options),
          ...virtualPlugins,
        ];

        const originalGetScannedPackage =
          manager.getScannedPackage.bind(manager);
        manager.getScannedPackage = (plugin: any) => {
          const stub = scannedPackages.get(plugin.name);
          if (stub) return stub;
          return originalGetScannedPackage(plugin);
        };

        // The manifest already has the correct publicPath baked in, so
        // setResolverProvider is only needed to satisfy the type contract —
        // customizeManifest is a no-op here.
        frontendRemotesServer.setResolverProvider({
          for: (_pluginName: string) =>
            scannedPackages.has(_pluginName)
              ? { customizeManifest: (content: any) => content }
              : undefined,
        });
      },
    });
  },
});
