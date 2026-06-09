import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { resolveSafeChildPath } from '@backstage/backend-plugin-api';
import yaml from 'js-yaml';
import fs from 'fs-extra';
import path from 'path';
import https from 'https';

// Resolves {param} placeholders in a path template using actual parameter values.
// Validates literal segments before substitution and all segments after, rejecting
// empty, '.' or '..' to prevent directory traversal.
// e.g. resolvePathTemplate('clusters/{dc}/{xrName}', { dc: 'EU', xrName: 'my-db' }) → 'clusters/eu/my-db'
function resolvePathTemplate(template: string, params: Record<string, any>): string {
  const isPlaceholder = (s: string) => /^\{\w+\}$/.test(s);
  const isBadSegment = (s: string) => !s || s === '.' || s === '..';

  // Validate literal (non-placeholder) segments before substitution
  for (const seg of template.split(/[/\\]/)) {
    if (!isPlaceholder(seg) && isBadSegment(seg)) {
      throw new Error(`resolvePathTemplate: invalid literal segment '${seg}' in template '${template}'`);
    }
  }

  // Substitute placeholders, sanitizing each value
  const resolved = template.replace(/\{(\w+)\}/g, (_: string, p: string) => {
    const raw = params[p];
    const segment = (typeof raw === 'string' ? raw : String(raw ?? ''))
      .toLowerCase()
      .trim()
      .replace(/[/\\]+/g, '-');
    if (isBadSegment(segment)) {
      throw new Error(`resolvePathTemplate: invalid value for placeholder '{${p}}': '${raw}'`);
    }
    return segment;
  });

  // Re-check all segments of the resolved path
  for (const seg of resolved.split('/')) {
    if (isBadSegment(seg)) {
      throw new Error(`resolvePathTemplate: resolved path contains invalid segment '${seg}'`);
    }
  }

  return resolved;
}

// Helper function to generate SCM-specific URLs
function generateSourceFileUrl(gitRepo: string, gitBranch: string, filePath: string, scmType: string): string {
  const gitUrl = new URL("https://" + gitRepo);
  const owner = gitUrl.searchParams.get('owner');
  const repo = gitUrl.searchParams.get('repo');
  
  if (!owner || !repo) {
    return '';
  }

  const host = gitUrl.host;
  
  // Determine URL format based on configured SCM type
  switch (scmType?.toLowerCase()) {
    case 'gitlab':
      // GitLab or self-hosted GitLab
      return `https://${host}/${owner}/${repo}/-/blob/${gitBranch}/${filePath}`;
    case 'bitbucketcloud':
      // Bitbucket Cloud
      return `https://${host}/${owner}/${repo}/src/${gitBranch}/${filePath}`;
    case 'bitbucket':
      // Bitbucket Server
      return `https://${host}/projects/${owner}/repos/${repo}/browse/${filePath}?at=${gitBranch}`;
    case 'github':
    default:
      // GitHub or GitHub Enterprise
      return `https://${host}/${owner}/${repo}/blob/${gitBranch}/${filePath}`;
  }
}
export function createCrossplaneClaimAction({config}: {config: any}) {
  return createTemplateAction({
    id: 'terasky:claim-template',
    description: 'Templates a claim manifest based on input parameters',
    schema: {
      input: {
        parameters: z => z.record(z.any()).describe('Pass through of input parameters'),
        nameParam: z => z.string().describe('Template parameter to map to the name of the claim').default('xrName'),
        namespaceParam: z => z.string().describe('Template parameter to map to the namespace of the claim').default('xrNamespace'),
        excludeParams: z => z.array(z.string()).describe('Template parameters to exclude from the claim').default(['xrName', 'xrNamespace', 'clusters', 'targetBranch', 'repoUrl', '_editData', 'showAdvancedSettings']),
        apiVersion: z => z.string().describe('API Version of the claim'),
        kind: z => z.string().describe('Kind of the claim'),
        clusters: z => z.array(z.string()).min(1).describe('The target clusters to apply the resource to'),
        removeEmptyParams: z => z.boolean().describe('If set to false, empty parameters will be rendered in the manifest. by default they are removed').default(true),
        ownerParam: z => z.string().describe('Template parameter to map to the owner of the claim'),
        specFieldOrder: z => z.array(z.string()).describe('Ordered list of spec field names (derived from x-ui-order) to control key order in the generated manifest').optional(),
        xrdPathTemplate: z => z.string().optional().describe('Path template from terasky.backstage.io/target-path XRD annotation, e.g. presets/{dc}/{xrName}. Overrides manifestLayout/basePath.'),
        generateKustomization: z => z.boolean().optional().describe('When true, generates or updates kustomization.yaml in the target path (from terasky.backstage.io/create-kustomization-file XRD annotation)'),
      },
      output: {
        manifest: z => z.string().describe('The templated Kubernetes resource manifest'),
        manifestEncoded: z => z.string().describe('The templated Kubernetes resource manifest, base64-encoded for use in data URLs'),
        filePaths: z => z.array(z.string()).describe('The file paths of the written manifests'),
      },
    },
    async handler(ctx) {
      const input = ctx.input;
      ctx.logger.info(
        `Running example template with parameters: ${JSON.stringify(input.parameters)}`,
      );
      const annotationPrefix =
        config.getOptionalString('kubernetesIngestor.annotationPrefix') ||
        'terasky.backstage.io';
      if (input.parameters[input.nameParam] === 'foo') {
        throw new Error(`myParameter cannot be 'foo'`);
      }

      // Remove excluded parameters (always exclude showAdvancedSettings regardless of excludeParams list)
      const filteredParameters = { ...input.parameters };
      // Helper to delete nested keys using dot notation
      function deleteNested(obj: any, path: string) {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) return;
          current = current[parts[i]];
        }
        delete current[parts[parts.length - 1]];
      }
      function removeNestedKey(obj: any, keyName: string) {
        if (Array.isArray(obj)) {
          obj.forEach(item => removeNestedKey(item, keyName));
          return;
        }
        if (!obj || typeof obj !== 'object') {
          return;
        }
        delete obj[keyName];
        Object.values(obj).forEach(value => removeNestedKey(value, keyName));
      }
      const excludeSet = new Set([...input.excludeParams, 'showAdvancedSettings']);
      excludeSet.forEach((param: string) => {
        if (param !== 'showAdvancedSettings') {
          deleteNested(filteredParameters, param);
        }
      });
      removeNestedKey(filteredParameters, 'showAdvancedSettings');

      // Remove empty parameters if removeEmptyParams is true
      if (input.removeEmptyParams) {
        const removeEmpty = (obj: any) => {
          Object.keys(obj).forEach(key => {
            if (obj[key] && typeof obj[key] === 'object') {
              removeEmpty(obj[key]);
              if (Object.keys(obj[key]).length === 0) {
                delete obj[key];
              }
            } else if (obj[key] === null || obj[key] === undefined || obj[key] === '' || (Array.isArray(obj[key]) && obj[key].length === 0)) {
              delete obj[key];
            }
          });
        };
        removeEmpty(filteredParameters);
      }
      const sourceInfo = {
        pushToGit: (input.parameters as any).pushToGit,
        gitBranch: (input.parameters as any).targetBranch || config.getOptionalString('kubernetesIngestor.crossplane.xrds.publishPhase.git.targetBranch'),
        gitRepo: (input.parameters as any).repoUrl || config.getOptionalString('kubernetesIngestor.crossplane.xrds.publishPhase.git.repoUrl'),
        gitLayout: (input.parameters as any).manifestLayout,
        basePath: (input.parameters as any).manifestLayout === 'custom' 
          ? (input.parameters as any).basePath 
          : (input.parameters as any).manifestLayout === 'namespace-scoped'
            ? `${(input.parameters as any)[input.namespaceParam]}`
            : `${input.clusters[0]}/${(input.parameters as any)[input.namespaceParam]}/${input.kind}`
      }

      // If xrdPathTemplate is provided (from terasky.backstage.io/target-path XRD annotation),
      // write the file to the workspace root (empty basePath) so that targetPath in the
      // publish step controls the final location in the repo without path doubling.
      // e.g. annotation "clusters/{dc}/{xrName}" → targetPath="clusters/eu/my-app" in PR,
      //      file on disk → workspacePath/my-app.yaml (not workspacePath/clusters/eu/my-app/my-app.yaml)
      if (input.xrdPathTemplate) {
        sourceInfo.gitLayout = 'custom';
        sourceInfo.basePath = '';
      }

      // Write the manifest to the file system for each cluster
      const filePaths: string[] = [];
      let manifestYaml = '';
      input.clusters.forEach((cluster: string) => {
        const namespaceOrDefault = (input.parameters as any)[input.namespaceParam] && (input.parameters as any)[input.namespaceParam] !== ''
          ? (input.parameters as any)[input.namespaceParam]
          : 'cluster-scoped';
        
        // Determine the file path based on manifestLayout
        let filePath = '';
        if (sourceInfo.gitLayout === 'namespace-scoped') {
          filePath = path.join(
            namespaceOrDefault,
            input.kind,
            `${(input.parameters as any)[input.nameParam]}.yaml`
          );
        } else if (sourceInfo.gitLayout === 'custom') {
          filePath = path.join(
            sourceInfo.basePath,
            `${(input.parameters as any)[input.nameParam]}.yaml`
          );
        } else {
          // cluster-scoped
          filePath = path.join(
            cluster,
            namespaceOrDefault,
            input.kind,
            `${(input.parameters as any)[input.nameParam]}.yaml`
          );
        }
        const destFilepath = resolveSafeChildPath(ctx.workspacePath, filePath);

        // Generate the correct sourceFileUrl for this cluster.
        // When xrdPathTemplate is set, filePath is just the filename (workspace root),
        // but in the repo the file lives under the resolved template path (targetPath in publish step).
        let sourceFileUrl = '';
        if ((input.parameters as any).pushToGit && sourceInfo.gitRepo) {
          const scmType = config.getOptionalString('kubernetesIngestor.crossplane.xrds.publishPhase.target') || 'github';
          let repoFilePath = filePath;
          if (input.xrdPathTemplate) {
            const resolvedDir = resolvePathTemplate(input.xrdPathTemplate, input.parameters as Record<string, any>);
            repoFilePath = `${resolvedDir}/${path.basename(filePath)}`;
          }
          sourceFileUrl = generateSourceFileUrl(sourceInfo.gitRepo, sourceInfo.gitBranch, repoFilePath, scmType);
        }

        // Reorder spec fields according to specFieldOrder (derived from x-ui-order in XRD)
        let specObj: Record<string, any> = filteredParameters;
        if (input.specFieldOrder && input.specFieldOrder.length > 0) {
          const ordered: Record<string, any> = {};
          for (const key of input.specFieldOrder) {
            if (key in filteredParameters) {
              ordered[key] = filteredParameters[key];
            }
          }
          for (const key of Object.keys(filteredParameters)) {
            if (!(key in ordered)) {
              ordered[key] = filteredParameters[key];
            }
          }
          specObj = ordered;
        }

        // Create the manifest with the correct annotation for this cluster
        const manifest = {
          apiVersion: input.apiVersion,
          kind: input.kind,
          metadata: {
            annotations: {
              [`${annotationPrefix}/source-info`]: JSON.stringify(sourceInfo),
              [`${annotationPrefix}/add-to-catalog`]: 'true',
              [`${annotationPrefix}/owner`]: (input.parameters as any)[input.ownerParam],
              [`${annotationPrefix}/system`]: (input.parameters as any)[input.namespaceParam],
              ...(sourceFileUrl && { [`${annotationPrefix}/source-file-url`]: sourceFileUrl }),
            },
            name: (input.parameters as any)[input.nameParam],
            ...((input.parameters as any)[input.namespaceParam] && (input.parameters as any)[input.namespaceParam] !== '' ? { namespace: (input.parameters as any)[input.namespaceParam] } : {}),
          },
          spec: specObj,
        };

        manifestYaml = yaml.dump(manifest, {
          indent: 2,
          lineWidth: -1,  // Don't wrap lines
          noRefs: true,
          sortKeys: false,
        });
        fs.outputFileSync(destFilepath, manifestYaml);
        ctx.logger.info(`Manifest written to ${destFilepath}`);
        filePaths.push(destFilepath);
      });

      // Generate or update kustomization.yaml when terasky.backstage.io/create-kustomization-file: true on XRD.
      // Process each unique output directory independently so cluster-scoped layouts (multiple dirs) are handled.
      if (input.generateKustomization && filePaths.length > 0) {
        const repoUrlStr = sourceInfo.gitRepo ?? '';
        const targetBranch = sourceInfo.gitBranch ?? 'main';
        const repoHost = repoUrlStr.split('?')[0] || 'github.com';
        const queryString = repoUrlStr.includes('?') ? repoUrlStr.split('?')[1] : '';
        const urlParams = new URLSearchParams(queryString);
        const owner = urlParams.get('owner');
        const repo = urlParams.get('repo');

        let ghToken = '';
        const ghConfigs = config.getOptionalConfigArray('integrations.github') ?? [];
        for (const ghCfg of ghConfigs) {
          const cfgHost = ghCfg.getOptionalString('host') ?? 'github.com';
          if (cfgHost === repoHost) {
            ghToken = ghCfg.getOptionalString('token') ?? '';
            break;
          }
        }

        // github.com uses api.github.com; GHE uses <host>/api/v3
        const apiBase = repoHost === 'github.com'
          ? 'https://api.github.com'
          : `https://${repoHost}/api/v3`;

        // Group output files by their directory so each dir gets its own kustomization.yaml
        const dirToFiles = new Map<string, string[]>();
        for (const fp of filePaths) {
          const dir = path.dirname(fp);
          if (!dirToFiles.has(dir)) dirToFiles.set(dir, []);
          dirToFiles.get(dir)!.push(path.basename(fp));
        }

        for (const [kustomizationDir, fileNames] of dirToFiles) {
          const kustomizationPath = path.join(kustomizationDir, 'kustomization.yaml');
          // Derive the repo-relative path for this directory to fetch the existing file
          const resolvedRepoDir = input.xrdPathTemplate
            ? resolvePathTemplate(input.xrdPathTemplate, input.parameters as Record<string, any>)
            : path.relative(ctx.workspacePath, kustomizationDir);

          let existingResources: string[] = [];
          try {
            if (owner && repo) {
              const kustomizationGitPath = encodeURI(resolvedRepoDir ? `${resolvedRepoDir}/kustomization.yaml` : 'kustomization.yaml');
              const fetchUrl = `${apiBase}/repos/${owner}/${repo}/contents/${kustomizationGitPath}?ref=${targetBranch}`;

              const rawContent = await new Promise<string | null>((resolve) => {
                let resolved = false;
                const done = (v: string | null) => { if (!resolved) { resolved = true; resolve(v); } };
                const req = https.get(
                  fetchUrl,
                  {
                    headers: {
                      Accept: 'application/vnd.github.raw+json',
                      'User-Agent': 'backstage-scaffolder',
                      ...(ghToken ? { Authorization: `Bearer ${ghToken}` } : {}),
                    },
                  },
                  res => {
                    if (res.statusCode !== 200) { done(null); res.resume(); return; }
                    let data = '';
                    res.on('data', (chunk: string) => { data += chunk; });
                    res.on('end', () => done(data));
                  },
                );
                req.setTimeout(10_000, () => { req.destroy(new Error('Request timed out')); });
                req.on('error', () => done(null));
              });

              if (rawContent) {
                const parsed = yaml.load(rawContent) as any;
                if (Array.isArray(parsed?.resources)) {
                  existingResources = parsed.resources;
                  ctx.logger.info(`Fetched existing kustomization.yaml from ${resolvedRepoDir} with ${existingResources.length} resource(s)`);
                }
              }
            }
          } catch (e) {
            ctx.logger.warn(`Could not fetch existing kustomization.yaml for ${resolvedRepoDir}: ${e}`);
          }

          for (const fileName of fileNames) {
            if (!existingResources.includes(fileName)) existingResources.push(fileName);
          }

          const kustomizationContent = yaml.dump(
            { apiVersion: 'kustomize.config.k8s.io/v1beta1', kind: 'Kustomization', resources: existingResources },
            { lineWidth: -1, noRefs: true, sortKeys: false },
          );
          fs.outputFileSync(kustomizationPath, `---\n${kustomizationContent}`);
          ctx.logger.info(`kustomization.yaml written to ${kustomizationPath}`);
        }
      }

      // Output the manifest and file paths (last manifestYaml is output)
      ctx.output('manifest', manifestYaml);
      ctx.output('manifestEncoded', Buffer.from(manifestYaml, 'utf-8').toString('base64'));
      ctx.output('filePaths', filePaths);
    },
  });
}
