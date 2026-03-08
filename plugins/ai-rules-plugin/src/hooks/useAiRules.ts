import { useEntity } from '@backstage/plugin-catalog-react';
import { AIRuleType, AIRulesResponse, AIRule } from '../types';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useApi, configApiRef, discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';

export const useAiRules = () => {
  const { entity } = useEntity();
  const configApi = useApi(configApiRef);
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  
  const [rules, setRules] = useState<AIRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRuleTypes, setSelectedRuleTypes] = useState<AIRuleType[]>([]);
  const [appliedRuleTypes, setAppliedRuleTypes] = useState<AIRuleType[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Stabilize allowed rule types
  const allowedRuleTypes = useMemo(() => {
    return configApi.getOptionalStringArray('aiRules.allowedRuleTypes') as AIRuleType[] || [
      AIRuleType.CURSOR, AIRuleType.COPILOT, AIRuleType.CLINE, AIRuleType.CLAUDE_CODE,
      AIRuleType.WINDSURF, AIRuleType.ROO_CODE, AIRuleType.CODEX, AIRuleType.GEMINI,
      AIRuleType.AMAZON_Q, AIRuleType.CONTINUE, AIRuleType.AIDER,
    ];
  }, [configApi]);

  // Stabilize default rule types
  const defaultRuleTypes = useMemo(() => {
    // Check if the config has the aiRules section at all
    const aiRulesConfig = configApi.getOptionalConfig('aiRules');
    if (!aiRulesConfig) {
      // Config not loaded yet or aiRules section doesn't exist, use empty array
      return [];
    }
    
    const configuredDefaults = configApi.getOptionalStringArray('aiRules.defaultRuleTypes') as AIRuleType[];
    
    // If defaultRuleTypes is explicitly configured (even as empty array), use that
    // If not configured at all, use empty array
    return configuredDefaults !== undefined ? configuredDefaults : [];
  }, [configApi]);

  // Extract stable entity properties
  const entityData = useMemo(() => {
    const sourceAnnotation = entity.metadata?.annotations?.['backstage.io/source-location'] || '';
    const hasGitUrl = sourceAnnotation.startsWith('url:');
    
    let gitUrl = hasGitUrl ? sourceAnnotation.substring(4) : undefined;
    if (gitUrl) {
      // Remove trailing slashes and normalize URL
      gitUrl = gitUrl.replace(/\/+$/, '');
      // Handle GitHub tree/blob URLs - extract base repo URL
      const treeMatch = gitUrl.match(/^(.+)\/tree\/([^/]+)(?:\/(.+))?$/);
      const blobMatch = gitUrl.match(/^(.+)\/blob\/([^/]+)(?:\/(.+))?$/);
      if (treeMatch) {
        gitUrl = treeMatch[1]; // Just the base repo URL
      }
      if (blobMatch) {
        gitUrl = blobMatch[1]; // Just the base repo URL  
      }
    }

    return {
      kind: entity.kind,
      namespace: entity.metadata.namespace || 'default',
      name: entity.metadata.name,
      sourceAnnotation,
      hasGitUrl,
      gitUrl,
    };
  }, [entity.kind, entity.metadata.namespace, entity.metadata.name, entity.metadata?.annotations?.['backstage.io/source-location']]);

  // Initialize selected and applied rule types when defaultRuleTypes is available
  useEffect(() => {
    // Check if config is loaded
    const aiRulesConfig = configApi.getOptionalConfig('aiRules');
    const configLoaded = aiRulesConfig !== undefined;
    
    if (!initialized && allowedRuleTypes.length > 0 && configLoaded) {
      setSelectedRuleTypes(defaultRuleTypes);
      setAppliedRuleTypes(defaultRuleTypes);
      setInitialized(true);
    }
  }, [defaultRuleTypes, allowedRuleTypes, initialized, configApi]);

  // Stable fetch function
  const fetchAiRules = useCallback(async (ruleTypes: AIRuleType[]) => {
    if (!entityData.hasGitUrl || !entityData.gitUrl) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);
      
      const baseUrl = await discoveryApi.getBaseUrl('ai-rules');
      const url = new URL(`${baseUrl}/rules`);
      
      // Send the Git URL directly to the backend
      url.searchParams.append('gitUrl', entityData.gitUrl);
      if (ruleTypes.length > 0) {
        url.searchParams.append('ruleTypes', ruleTypes.join(','));
      }

      const response = await fetchApi.fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Failed to fetch AI rules: ${response.statusText}`);
      }

      const data: AIRulesResponse = await response.json();
      setRules(data.rules);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('Error fetching AI rules:', errorMessage);
      setError(errorMessage);
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [entityData.hasGitUrl, entityData.gitUrl, discoveryApi, fetchApi]);

  // Manual apply filter function
  const applyFilters = useCallback(() => {
    setAppliedRuleTypes([...selectedRuleTypes]);
    if (selectedRuleTypes.length > 0) {
      fetchAiRules(selectedRuleTypes);
    } else {
      // If no rule types selected, clear rules
      setRules([]);
      setError(null);
      setHasSearched(true);
    }
  }, [selectedRuleTypes, fetchAiRules]);

  // Reset filters to allowed rule types and apply immediately
  const resetFilters = useCallback(() => {
    setSelectedRuleTypes(allowedRuleTypes);
    setAppliedRuleTypes([...allowedRuleTypes]);
    if (allowedRuleTypes.length > 0) {
      fetchAiRules(allowedRuleTypes);
    }
  }, [allowedRuleTypes, fetchAiRules]);

  // Fetch rules when applied rule types change (triggered by applyFilters)
  useEffect(() => {
    if (appliedRuleTypes.length > 0) {
      fetchAiRules(appliedRuleTypes);
    }
  }, [fetchAiRules, appliedRuleTypes]);

  const rulesByType = useMemo(() => {
    return rules.reduce((acc, rule) => {
      if (!acc[rule.type]) {
        acc[rule.type] = [];
      }
      acc[rule.type].push(rule);
      return acc;
    }, {} as Record<AIRuleType, AIRule[]>);
  }, [rules]);

  return {
    rules,
    rulesByType,
    loading,
    error,
    hasGitUrl: entityData.hasGitUrl,
    componentName: entityData.name,
    allowedRuleTypes,
    defaultRuleTypes,
    selectedRuleTypes,
    setSelectedRuleTypes,
    appliedRuleTypes,
    applyFilters,
    resetFilters,
    totalRules: rules.length,
    hasSearched,
    hasUnappliedChanges: JSON.stringify(selectedRuleTypes.sort()) !== JSON.stringify(appliedRuleTypes.sort()),
  };
};