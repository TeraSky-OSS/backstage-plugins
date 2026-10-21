import { constructFileUrl } from './constructFileUrl';

describe('constructFileUrl', () => {
  it('builds GitHub blob URLs', () => {
    expect(constructFileUrl('https://github.com/org/repo/', 'a/b.md')).toBe(
      'https://github.com/org/repo/blob/main/a/b.md',
    );
  });

  it('builds GitLab blob URLs', () => {
    expect(constructFileUrl('https://gitlab.com/group/repo', 'a.md')).toBe(
      'https://gitlab.com/group/repo/-/blob/main/a.md',
    );
  });

  it('does not treat gitlab.com elsewhere in the URL as GitLab', () => {
    expect(
      constructFileUrl('https://evil.example/gitlab.com/repo', 'a.md'),
    ).toBe('https://evil.example/gitlab.com/repo/blob/main/a.md');
    expect(constructFileUrl('https://gitlab.com.evil.example/repo', 'a.md')).toBe(
      'https://gitlab.com.evil.example/repo/blob/main/a.md',
    );
  });

  it('falls back for values that are not URLs', () => {
    expect(constructFileUrl('not a url///', 'a.md')).toBe(
      'not a url/blob/main/a.md',
    );
  });
});
