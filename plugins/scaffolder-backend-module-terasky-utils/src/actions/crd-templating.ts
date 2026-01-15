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

export function createCrdTemplateAction({config}: {config: any}) {
  return createTemplateAction({
    id: 'terasky:crd-template',
    description: 'Templates a CRD manifest based on input parameters',
    schema: {
      input: {
        ownerParam: z => z.any(),
        parameters: z => z.record(z.any()),
        nameParam: z => z.string(),
        namespaceParam: z => z.string().describe('Template parameter to map to the namespace of the resource').default('xrNamespace'),
        excludeParams: z => z.array(z.string()),
        apiVersion: z => z.string(),
        kind: z => z.string(),
        removeEmptyParams: z => z.boolean().optional(),
        clusters: z => z.array(z.string()).min(1),
      },
      output: {
        manifest: z => z.string(),
        filePaths: z => z.array(z.string()),
      },
    },
    async handler(ctx) {
      const input = ctx.input;
      ctx.logger.info(
        `Running CRD template with parameters: ${JSON.stringify(input.parameters)}`,
      );

      const annotationPrefix =
        config.getOptionalString('kubernetesIngestor.annotationPrefix') ||
        'terasky.backstage.io';

      // Remove excluded parameters
      const filteredParameters = { ...input.parameters };
      input.excludeParams.forEach((param: string) => {
        delete filteredParameters[param];
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
            ? `${(input.parameters as any)[input.namespaceParam || 'namespace']}`
            : `${input.clusters[0]}/cluster-scoped/${input.kind}`
      }

      // Handle cluster-specific paths or default path
      const filePaths: string[] = [];
      let manifestYaml = '';
      input.clusters.forEach((cluster: string) => {
        const namespaceOrDefault = (input.parameters as any)[input.namespaceParam] && (input.parameters as any)[input.namespaceParam] !== 'xrNamespace' && (input.parameters as any)[input.namespaceParam] !== ''
          ? (input.parameters as any)[input.namespaceParam]
          : 'cluster-scoped';
        const filePath = path.join(
          cluster,
          namespaceOrDefault,
          input.kind,
          `${(input.parameters as any)[input.nameParam]}.yaml`
        );
        const destFilepath = resolveSafeChildPath(ctx.workspacePath, filePath);

        // Determine the final file path for the source URL annotation based on manifestLayout
        let finalFilePath = '';
        if (sourceInfo.gitLayout === 'namespace-scoped') {
          finalFilePath = path.join(
            namespaceOrDefault,
            input.kind,
            `${(input.parameters as any)[input.nameParam]}.yaml`
          );
        } else if (sourceInfo.gitLayout === 'custom') {
          finalFilePath = path.join(
            sourceInfo.basePath,
            `${(input.parameters as any)[input.nameParam]}.yaml`
          );
        } else {
          // cluster-scoped - use the actual cluster name for this iteration
          finalFilePath = path.join(
            cluster,
            namespaceOrDefault,
            input.kind,
            `${(input.parameters as any)[input.nameParam]}.yaml`
          );
        }

        // Generate the correct sourceFileUrl for this cluster
        let sourceFileUrl = '';
        if ((input.parameters as any).pushToGit && sourceInfo.gitRepo) {
          const scmType = config.getOptionalString('kubernetesIngestor.genericCRDTemplates.publishPhase.target') || 'github';
          sourceFileUrl = generateSourceFileUrl(sourceInfo.gitRepo, sourceInfo.gitBranch, finalFilePath, scmType);
        }

        // Template the Kubernetes resource manifest with the correct annotation for this cluster
        const manifest = {
          apiVersion: input.apiVersion,
          kind: input.kind,
          metadata: {
            name: (input.parameters as any)[input.nameParam],
            ...(input.namespaceParam && {
              namespace: (input.parameters as any)[input.namespaceParam],
            }),
            annotations: {
              [`${annotationPrefix}/source-info`]: JSON.stringify(sourceInfo),
              [`${annotationPrefix}/add-to-catalog`]: "true",
              [`${annotationPrefix}/owner`]: (input.parameters as any)[input.ownerParam],
              [`${annotationPrefix}/system`]: (input.parameters as any)[input.namespaceParam || 'namespace'],
              ...(sourceFileUrl && { [`${annotationPrefix}/source-file-url`]: sourceFileUrl }),
            },
          },
          spec: filteredParameters,
        };

        // Convert manifest to YAML
        manifestYaml = yaml.dump(manifest);

        fs.outputFileSync(destFilepath, manifestYaml);
        ctx.logger.info(`Manifest written to ${destFilepath}`);
        filePaths.push(destFilepath);
      });

      // Output the manifest and file paths (last manifestYaml is output)
      ctx.output('manifest', manifestYaml);
      ctx.output('filePaths', filePaths);
    },
  });
} 
