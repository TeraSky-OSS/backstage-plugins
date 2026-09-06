import { createAzureDevOpsRepositoryDetailsAction } from './azure-devops-repository';

describe('createAzureDevOpsRepositoryDetailsAction', () => {
  const action = createAzureDevOpsRepositoryDetailsAction();
  const output = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the expected action id', () => {
    expect(action.id).toBe('terasky:azure-devops:repository-details');
  });

  it('parses a RepoUrlPicker Azure DevOps URL', async () => {
    await action.handler!({
      input: {
        repoUrl: 'dev.azure.com?organization=example&project=Platform%20Engineering&repo=gitops',
      },
      output,
    } as any);

    expect(output).toHaveBeenCalledWith('organization', 'example');
    expect(output).toHaveBeenCalledWith('project', 'Platform Engineering');
    expect(output).toHaveBeenCalledWith('repository', 'gitops');
    expect(output).toHaveBeenCalledWith(
      'remoteUrl',
      'https://dev.azure.com/example/Platform%20Engineering/_git/gitops',
    );
  });

  it('rejects an incomplete or non-Azure DevOps URL', async () => {
    await expect(
      action.handler!({ input: { repoUrl: 'github.com?owner=example&repo=gitops' }, output } as any),
    ).rejects.toThrow('repoUrl must be an Azure DevOps RepoUrlPicker value');
  });

  it('rejects an unparseable repoUrl with the same format message', async () => {
    await expect(
      action.handler!({ input: { repoUrl: 'not a url' }, output } as any),
    ).rejects.toThrow('repoUrl must be an Azure DevOps RepoUrlPicker value');
  });
});
