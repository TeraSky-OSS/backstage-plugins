import { useApi } from '@backstage/core-plugin-api';
import { useCallback, useEffect, useState } from 'react';
import { aiRulesApiRef } from '../api/types';
import type { AiRulesApi } from '../api/types';
import { MCPServerInfo } from '../types/mcp';
import { useEntity } from '@backstage/plugin-catalog-react';

export const useMCPServers = () => {
  const api = useApi(aiRulesApiRef) as AiRulesApi;
  const { entity } = useEntity();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [servers, setServers] = useState<MCPServerInfo[]>([]);
  const [hasGitUrl, setHasGitUrl] = useState(true);

  const sourceLocation = entity.metadata?.annotations?.['backstage.io/source-location'];

  const fetchServers = useCallback(async () => {
    if (!sourceLocation) {
      setHasGitUrl(false);
      return;
    }

    try {
      setLoading(true);
      setError(undefined);
      // Clean up the Git URL - remove url: prefix and /tree/main/ or /tree/master/
      const gitUrl = sourceLocation
        .replace('url:', '')
        .replace(/\/tree\/(?:main|master)\/.*$/, '');
      const response = await api.getMCPServers(gitUrl);
      setServers(response.servers);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, sourceLocation]);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  return {
    loading,
    error,
    servers,
    hasGitUrl,
    refetch: fetchServers,
  };
};
