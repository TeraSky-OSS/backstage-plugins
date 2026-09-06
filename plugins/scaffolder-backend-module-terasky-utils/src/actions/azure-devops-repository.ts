import { createTemplateAction } from '@backstage/plugin-scaffolder-node';

/**
 * Parses the RepoUrlPicker Azure DevOps form value used by Backstage:
 * dev.azure.com?organization=<org>&project=<project>&repo=<repo>.
 *
 * The Azure DevOps scaffolder actions need those values separately, while the
 * Kubernetes ingestor must support both its configured repository and a
 * repository selected by the user at template execution time.
 */
export function createAzureDevOpsRepositoryDetailsAction() {
  return createTemplateAction({
    id: 'terasky:azure-devops:repository-details',
    description: 'Parse an Azure DevOps repository URL for scaffolder actions',
    schema: {
      input: {
        repoUrl: z => z.string().describe('Azure DevOps repository URL from RepoUrlPicker'),
      },
      output: {
        organization: z => z.string().describe('Azure DevOps organization'),
        project: z => z.string().describe('Azure DevOps project'),
        repository: z => z.string().describe('Azure DevOps repository name'),
        remoteUrl: z => z.string().describe('HTTPS Git URL for the repository'),
      },
    },
    async handler(ctx) {
      const invalidRepoUrlError = new Error(
        'repoUrl must be an Azure DevOps RepoUrlPicker value: ' +
        'dev.azure.com?organization=<organization>&project=<project>&repo=<repository>',
      );

      let url: URL;
      try {
        url = new URL(
          ctx.input.repoUrl.includes('://')
            ? ctx.input.repoUrl
            : `https://${ctx.input.repoUrl}`,
        );
      } catch {
        throw invalidRepoUrlError;
      }

      const organization = url.searchParams.get('organization');
      const project = url.searchParams.get('project');
      const repository = url.searchParams.get('repo');

      if (url.hostname !== 'dev.azure.com' || !organization || !project || !repository) {
        throw invalidRepoUrlError;
      }

      ctx.output('organization', organization);
      ctx.output('project', project);
      ctx.output('repository', repository);
      ctx.output(
        'remoteUrl',
        `https://dev.azure.com/${encodeURIComponent(organization)}/${encodeURIComponent(project)}/_git/${encodeURIComponent(repository)}`,
      );
    },
  });
}
