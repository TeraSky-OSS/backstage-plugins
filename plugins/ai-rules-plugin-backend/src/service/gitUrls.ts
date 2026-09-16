/**
 * Helpers for turning a repository URL plus a path inside that repository into
 * a URL the Backstage UrlReader can resolve.
 *
 * Most providers address files through path segments, but Azure DevOps takes
 * the path from the `path` query parameter, so appending segments there
 * produces a URL that either 404s or fails `AzureUrl` validation outright.
 */

/**
 * Azure DevOps repository URLs look like
 * `https://dev.azure.com/{organization}/{project}/_git/{repository}` or
 * `https://{organization}.visualstudio.com/{project}/_git/{repository}`.
 */
function isAzureDevOpsUrl(url: URL): boolean {
  return (
    url.hostname === 'dev.azure.com' ||
    url.hostname.endsWith('.visualstudio.com')
  );
}

/**
 * Rewrites the `path` query parameter, preserving `version` so that reads stay
 * on the branch or tag the caller was given.
 */
function azureUrlForPath(url: URL, path: string): string {
  const target = new URL(url.toString());
  target.searchParams.set('path', `/${path.replace(/^\/+/, '')}`);
  return target.toString();
}

function trimTrailingSlashes(gitUrl: string): string {
  return gitUrl.replace(/\/+$/, '');
}

/**
 * Builds a URL for reading a single file from a repository.
 */
export function buildFileUrl(gitUrl: string, filePath: string): string {
  const url = new URL(gitUrl);
  if (isAzureDevOpsUrl(url)) {
    return azureUrlForPath(url, filePath);
  }
  return `${trimTrailingSlashes(gitUrl)}/blob/HEAD/${filePath}`;
}

/**
 * Builds a URL for reading a directory tree from a repository.
 */
export function buildTreeUrl(gitUrl: string, path: string): string {
  const url = new URL(gitUrl);
  if (isAzureDevOpsUrl(url)) {
    return azureUrlForPath(url, path);
  }
  return `${trimTrailingSlashes(gitUrl)}/tree/HEAD/${path}`;
}
