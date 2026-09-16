import { buildFileUrl, buildTreeUrl } from './gitUrls';

describe('buildFileUrl', () => {
  it('addresses Azure DevOps files through the path query parameter', () => {
    expect(
      buildFileUrl(
        'https://dev.azure.com/my-org/my-project/_git/my-repo',
        'AGENTS.md',
      ),
    ).toBe(
      'https://dev.azure.com/my-org/my-project/_git/my-repo?path=%2FAGENTS.md',
    );
  });

  it('keeps the Azure DevOps branch or tag the caller was given', () => {
    expect(
      buildFileUrl(
        'https://dev.azure.com/my-org/my-project/_git/my-repo?path=%2F&version=GBmain',
        '.cursor/rules/my-rule.mdc',
      ),
    ).toBe(
      'https://dev.azure.com/my-org/my-project/_git/my-repo?path=%2F.cursor%2Frules%2Fmy-rule.mdc&version=GBmain',
    );
  });

  it('supports the legacy visualstudio.com host', () => {
    expect(
      buildFileUrl(
        'https://my-org.visualstudio.com/my-project/_git/my-repo?version=GBmaster',
        'AGENTS.md',
      ),
    ).toBe(
      'https://my-org.visualstudio.com/my-project/_git/my-repo?version=GBmaster&path=%2FAGENTS.md',
    );
  });

  it('addresses other providers through path segments', () => {
    expect(buildFileUrl('https://github.com/my-org/my-repo', 'AGENTS.md')).toBe(
      'https://github.com/my-org/my-repo/blob/HEAD/AGENTS.md',
    );
    expect(
      buildFileUrl('https://gitlab.com/my-org/my-repo', 'CLAUDE.md'),
    ).toBe('https://gitlab.com/my-org/my-repo/blob/HEAD/CLAUDE.md');
  });

  it('tolerates trailing slashes', () => {
    expect(
      buildFileUrl('https://github.com/my-org/my-repo//', 'AGENTS.md'),
    ).toBe('https://github.com/my-org/my-repo/blob/HEAD/AGENTS.md');
  });
});

describe('buildTreeUrl', () => {
  it('addresses Azure DevOps directories through the path query parameter', () => {
    expect(
      buildTreeUrl(
        'https://dev.azure.com/my-org/my-project/_git/my-repo?path=%2F&version=GBmain',
        '.agents/skills',
      ),
    ).toBe(
      'https://dev.azure.com/my-org/my-project/_git/my-repo?path=%2F.agents%2Fskills&version=GBmain',
    );
  });

  it('addresses other providers through path segments', () => {
    expect(
      buildTreeUrl('https://github.com/my-org/my-repo', '.cursor/rules'),
    ).toBe('https://github.com/my-org/my-repo/tree/HEAD/.cursor/rules');
  });
});
