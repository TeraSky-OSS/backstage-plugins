import { constructFileUrl, openFileInRepo } from './constructFileUrl';

// Built at runtime so the literal does not trip no-script-url.
const scriptUrl = ['javascript', 'alert(1);//x'].join(':');

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

  it('rejects values that are not http(s) URLs', () => {
    expect(constructFileUrl('not a url///', 'a.md')).toBeUndefined();
    expect(constructFileUrl(scriptUrl, 'a.md')).toBeUndefined();
    expect(constructFileUrl('file:///etc/passwd', 'a.md')).toBeUndefined();
  });
});

describe('openFileInRepo', () => {
  const open = jest.spyOn(window, 'open').mockImplementation(() => null);

  afterEach(() => open.mockClear());
  afterAll(() => open.mockRestore());

  it('opens valid repository links', () => {
    openFileInRepo('https://github.com/org/repo', 'a.md');
    expect(open).toHaveBeenCalledWith(
      'https://github.com/org/repo/blob/main/a.md',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('does not open non-http(s) URLs', () => {
    openFileInRepo(scriptUrl, 'a.md');
    expect(open).not.toHaveBeenCalled();
  });
});
