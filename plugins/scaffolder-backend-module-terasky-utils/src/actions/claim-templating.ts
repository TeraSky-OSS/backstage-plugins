import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { resolveSafeChildPath } from '@backstage/backend-plugin-api';
import yaml from 'js-yaml';
import fs from 'fs-extra';
import path from 'path';

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
        excludeParams: z => z.array(z.string()).describe('Template parameters to exclude from the claim').default(['xrName', 'xrNamespace', 'clusters', 'targetBranch', 'repoUrl', '_editData']),
        apiVersion: z => z.string().describe('API Version of the claim'),
        kind: z => z.string().describe('Kind of the claim'),
        clusters: z => z.array(z.string()).min(1).describe('The target clusters to apply the resource to'),
        removeEmptyParams: z => z.boolean().describe('If set to false, empty parameters will be rendered in the manifest. by default they are removed').default(true),
        ownerParam: z => z.string().describe('Template parameter to map to the owner of the claim'),
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
      if (input.parameters[input.nameParam] === 'foo') {
        throw new Error(`myParameter cannot be 'foo'`);
      }

      // Remove excluded parameters
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
      input.excludeParams.forEach((param: string) => {
        deleteNested(filteredParameters, param);
      });

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

      // Write the manifest to the file system for each cluster
      const filePaths: string[] = [];
      let manifestYaml = '';
      input.clusters.forEach((cluster: string) => {
        const namespaceOrDefault = (input.parameters as any)[input.namespaceParam] && (input.parameters as any)[input.namespaceParam] !== ''
          ? (input.parameters as any)[input.namespaceParam]
          : 'cluster-scoped';
        const filePath = path.join(
          cluster,
          namespaceOrDefault,
          input.kind,
          `${(input.parameters as any)[input.nameParam]}.yaml`
        );
        const destFilepath = resolveSafeChildPath(ctx.workspacePath, filePath);

        // Generate the correct sourceFileUrl for this cluster
        let sourceFileUrl = '';
        if ((input.parameters as any).pushToGit && sourceInfo.gitRepo) {
          const scmType = config.getOptionalString('kubernetesIngestor.crossplane.xrds.publishPhase.target') || 'github';
          sourceFileUrl = generateSourceFileUrl(sourceInfo.gitRepo, sourceInfo.gitBranch, filePath, scmType);
        }

        // Create the manifest with the correct annotation for this cluster
        const manifest = {
          apiVersion: input.apiVersion,
          kind: input.kind,
          metadata: {
            annotations: {
              'terasky.backstage.io/source-info': JSON.stringify(sourceInfo),
              'terasky.backstage.io/add-to-catalog': "true",
              'terasky.backstage.io/owner': (input.parameters as any)[input.ownerParam],
              'terasky.backstage.io/system': (input.parameters as any)[input.namespaceParam],
              ...(sourceFileUrl && { 'terasky.backstage.io/source-file-url': sourceFileUrl }),
            },
            name: (input.parameters as any)[input.nameParam],
            ...((input.parameters as any)[input.namespaceParam] && (input.parameters as any)[input.namespaceParam] !== '' ? { namespace: (input.parameters as any)[input.namespaceParam] } : {}),
          },
          spec: filteredParameters,
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

      // Output the manifest and file paths (last manifestYaml is output)
      ctx.output('manifest', manifestYaml);
      ctx.output('manifestEncoded', Buffer.from(manifestYaml, 'utf-8').toString('base64'));
      ctx.output('filePaths', filePaths);
    },
  });
}