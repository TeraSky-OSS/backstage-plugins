const trimTrailingSlashes = (url: string): string => {
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') {
    end--;
  }
  return url.slice(0, end);
};

const getHostname = (url: string): string => {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
};

/**
 * Builds a link to a file in the repository's web UI. The host is matched on
 * the parsed hostname rather than a substring of the URL.
 */
export const constructFileUrl = (gitUrl: string, filePath: string): string => {
  const cleanGitUrl = trimTrailingSlashes(gitUrl);
  const hostname = getHostname(cleanGitUrl);
  if (hostname === 'gitlab.com' || hostname.endsWith('.gitlab.com')) {
    return `${cleanGitUrl}/-/blob/main/${filePath}`;
  }
  return `${cleanGitUrl}/blob/main/${filePath}`;
};
