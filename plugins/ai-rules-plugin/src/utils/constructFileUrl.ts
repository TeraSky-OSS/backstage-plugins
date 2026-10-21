const trimTrailingSlashes = (url: string): string => {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') {
    end--;
  }
  return url.slice(0, end);
};

/**
 * Returns the lower-cased hostname of an http(s) URL, or undefined for
 * anything else (relative paths, `javascript:` and other schemes).
 */
const getHttpHostname = (url: string): string | undefined => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }
    return parsed.hostname.toLowerCase() || undefined;
  } catch {
    return undefined;
  }
};

/**
 * Builds a link to a file in the repository's web UI, or undefined when the
 * repository URL is not an http(s) URL. The host is matched on the parsed
 * hostname rather than a substring of the URL.
 */
export const constructFileUrl = (
  gitUrl: string,
  filePath: string,
): string | undefined => {
  const cleanGitUrl = trimTrailingSlashes(gitUrl);
  const hostname = getHttpHostname(cleanGitUrl);
  if (!hostname) {
    return undefined;
  }
  if (hostname === 'gitlab.com' || hostname.endsWith('.gitlab.com')) {
    return `${cleanGitUrl}/-/blob/main/${filePath}`;
  }
  return `${cleanGitUrl}/blob/main/${filePath}`;
};

/**
 * Opens a file in the repository's web UI in a new tab. Does nothing when the
 * repository URL is not a valid http(s) URL.
 */
export const openFileInRepo = (gitUrl: string, filePath: string): void => {
  const url = constructFileUrl(gitUrl, filePath);
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};
