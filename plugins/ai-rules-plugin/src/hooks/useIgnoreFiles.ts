import { useApi } from '@backstage/core-plugin-api';
import { useCallback, useEffect, useState } from 'react';
import { aiRulesApiRef } from '../api/types';
import type { AiRulesApi } from '../api/types';
import { IgnoreFile } from '../types';
import { useEntity } from '@backstage/plugin-catalog-react';

export const useIgnoreFiles = () => {
  const api = useApi(aiRulesApiRef) as AiRulesApi;
  const { entity } = useEntity();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [files, setFiles] = useState<IgnoreFile[]>([]);
  const [hasGitUrl, setHasGitUrl] = useState(true);

  const sourceLocation = entity.metadata?.annotations?.['backstage.io/source-location'];

  const fetchFiles = useCallback(async () => {
    if (!sourceLocation) {
      setHasGitUrl(false);
      return;
    }
    try {
      setLoading(true);
      setError(undefined);
      const gitUrl = sourceLocation
        .replace('url:', '')
        .replace(/\/tree\/(?:main|master)\/.*$/, '');
      const response = await api.getIgnoreFiles(gitUrl);
      setFiles(response.files);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, sourceLocation]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  return { loading, error, files, hasGitUrl, refetch: fetchFiles };
};
