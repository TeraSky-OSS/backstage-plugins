import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { resolveSafeChildPath } from '@backstage/backend-plugin-api';
import yaml from 'js-yaml';
import fs from 'fs-extra';
import path from 'path';

export function createCrossplaneClaimAction({config}: {config: any}) {
  return createTemplateAction<{
    parameters: Record<string, any>;
    nameParam: string;
    namespaceParam: string;
    excludeParams: string[];
    apiVersion: string;
    kind: string;
    clusters: string[];
    removeEmptyParams?: boolean;
    ownerParam: string;
  }>({
    id: 'terasky:claim-template',
    description: 'Templates a claim manifest based on input parameters',
    schema: {
      input: {
        type: 'object',
        required: ['parameters', 'nameParam', 'excludeParams', 'apiVersion', 'kind', 'clusters'],
        properties: {
          parameters: {
            title: 'Pass through of input parameters',
            description: "Pass through of input parameters",
            type: 'object',
          },
          nameParam: {
            title: 'Template parameter to map to the name of the claim',
            description: "Template parameter to map to the name of the claim",
            type: 'string',
            default: 'xrName'
          },
          namespaceParam: {
            title: 'Template parameter to map to the namespace of the claim',
            description: "Template parameter to map to the namespace of the claim",
            type: 'string',
            default: 'xrNamespace'
          },
          excludeParams: { 
            title: 'Template parameters to exclude from the claim',
            description: "Template parameters to exclude from the claim",
            type: 'array',
            items: {
              type: 'string',
            },
            default: ['xrName', 'xrNamespace', 'clusters', 'targetBranch', 'repoUrl', '_editData']
          },
          apiVersion: {
            title: 'API Version of the claim',
            description: "API Version of the claim",
            type: 'string',
          },
          kind: {
            title: 'Kind of the claim',
            description: "Kind of the claim",
            type: 'string',
          },
          clusters: {
            title: 'Target clusters',
            description: 'The target clusters to apply the resource to',
            type: 'array',
            items: {
              type: 'string',
            },
            minItems: 1,
          },
          removeEmptyParams: {
            title: 'Remove Empty Parameters',
            description: 'If set to false, empty parameters will be rendered in the manifest. by default they are removed',
            type: 'boolean',
            default: true,
          },
          ownerParam: {
            title: 'Template parameter to map to the owner of the claim',
            description: "Template parameter to map to the owner of the claim",
            type: 'string',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          manifest: {
            title: 'Manifest',
            description: 'The templated Kubernetes resource manifest',
            type: 'string',
          },
          filePaths: {
            title: 'File paths',
            description: 'The file paths of the written manifests',
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
      },
    },
    async handler(ctx) {
      ctx.logger.info(
        `Running example template with parameters: ${JSON.stringify(ctx.input.parameters)}`,
      );
      if (ctx.input.parameters[ctx.input.nameParam] === 'foo') {
        throw new Error(`myParameter cannot be 'foo'`);
      }

      // Remove excluded parameters
      const filteredParameters = { ...ctx.input.parameters };
      ctx.input.excludeParams.forEach(param => {
        delete filteredParameters[param];
      });

      // Remove empty parameters if removeEmptyParams is true
      if (ctx.input.removeEmptyParams) {
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
        pushToGit: ctx.input.parameters.pushToGit,
        gitBranch: ctx.input.parameters.targetBranch || config.getOptionalString('kubernetesIngestor.crossplane.xrds.publishPhase.git.targetBranch'),
        gitRepo: ctx.input.parameters.repoUrl || config.getOptionalString('kubernetesIngestor.crossplane.xrds.publishPhase.git.repoUrl'),
        gitLayout: ctx.input.parameters.manifestLayout,
        basePath: ctx.input.parameters.manifestLayout === 'custom' 
          ? ctx.input.parameters.basePath 
          : ctx.input.parameters.manifestLayout === 'namespace-scoped'
            ? `${ctx.input.parameters[ctx.input.namespaceParam]}`
            : `${ctx.input.clusters[0]}/${ctx.input.parameters[ctx.input.namespaceParam]}/${ctx.input.kind}`
      }
      let sourceFileUrl = '';
      if (ctx.input.parameters.pushToGit && sourceInfo.gitRepo) {
        const gitUrl = new URL("https://" + sourceInfo.gitRepo);
        const owner = gitUrl.searchParams.get('owner');
        const repo = gitUrl.searchParams.get('repo');
        if (owner && repo) {
          sourceFileUrl = `https://${gitUrl.host}/${owner}/${repo}/blob/${sourceInfo.gitBranch}/${sourceInfo.basePath}/${ctx.input.parameters[ctx.input.nameParam]}.yaml`;
        }
      }

      // Template the Kubernetes resource manifest
      const manifest = {
        apiVersion: ctx.input.apiVersion,
        kind: ctx.input.kind,
        metadata: {
          annotations: {
            'terasky.backstage.io/source-info': JSON.stringify(sourceInfo),
            'terasky.backstage.io/add-to-catalog': "true",
            'terasky.backstage.io/owner': ctx.input.parameters[ctx.input.ownerParam],
            'terasky.backstage.io/system': ctx.input.parameters[ctx.input.namespaceParam],
            ...(sourceFileUrl && { 'terasky.backstage.io/source-file-url': sourceFileUrl }),
          },
          name: ctx.input.parameters[ctx.input.nameParam],
          ...(ctx.input.parameters[ctx.input.namespaceParam] && ctx.input.parameters[ctx.input.namespaceParam] !== '' ? { namespace: ctx.input.parameters[ctx.input.namespaceParam] } : {}),
        },
        spec: filteredParameters,
      };

      // Convert manifest to YAML
      const manifestYaml = yaml.dump(manifest);

      // Write the manifest to the file system for each cluster
      const filePaths: string[] = [];
      ctx.input.clusters.forEach(cluster => {
        const namespaceOrDefault = ctx.input.parameters[ctx.input.namespaceParam] && ctx.input.parameters[ctx.input.namespaceParam] !== ''
          ? ctx.input.parameters[ctx.input.namespaceParam]
          : 'cluster-scoped';
        const filePath = path.join(
          cluster,
          namespaceOrDefault,
          ctx.input.kind,
          `${ctx.input.parameters[ctx.input.nameParam]}.yaml`
        );
        const destFilepath = resolveSafeChildPath(ctx.workspacePath, filePath);
        fs.outputFileSync(destFilepath, manifestYaml);
        ctx.logger.info(`Manifest written to ${destFilepath}`);
        filePaths.push(destFilepath);
      });

      // Output the manifest and file paths
      ctx.output('manifest', manifestYaml);
      ctx.output('filePaths', filePaths);
    },
  });
}