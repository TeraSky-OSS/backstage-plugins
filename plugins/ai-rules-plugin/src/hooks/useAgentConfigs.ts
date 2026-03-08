import { useApi } from '@backstage/core-plugin-api';
import { useCallback, useEffect, useState } from 'react';
import { aiRulesApiRef } from '../api/types';
import type { AiRulesApi } from '../api/types';
import { AgentConfig } from '../types';
import { useEntity } from '@backstage/plugin-catalog-react';

export const useAgentConfigs = () => {
  const api = useApi(aiRulesApiRef) as AiRulesApi;
  const { entity } = useEntity();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [configs, setConfigs] = useState<AgentConfig[]>([]);
  const [hasGitUrl, setHasGitUrl] = useState(true);

  const sourceLocation = entity.metadata?.annotations?.['backstage.io/source-location'];

  const fetchConfigs = useCallback(async () => {
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
      const response = await api.getAgentConfigs(gitUrl);
      setConfigs(response.configs);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, sourceLocation]);

  useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

  return { loading, error, configs, hasGitUrl, refetch: fetchConfigs };
};
