import { renderHook, act, waitFor } from '@testing-library/react';
import { useAiRules } from './useAiRules';
import { useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { AIRuleType } from '../types';

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: jest.fn(),
}));

jest.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: jest.fn(),
}));

const mockUseApi = useApi as jest.MockedFunction<typeof useApi>;
const mockUseEntity = useEntity as jest.MockedFunction<typeof useEntity>;

describe('useAiRules', () => {
  const mockConfigApi = {
    getOptionalStringArray: jest.fn(),
    getOptionalConfig: jest.fn(),
  };

  const mockDiscoveryApi = {
    getBaseUrl: jest.fn().mockResolvedValue('http://localhost:7007/api/ai-rules'),
  };

  const mockFetchApi = {
    fetch: jest.fn(),
  };

  const mockEntity = {
    kind: 'Component',
    apiVersion: 'backstage.io/v1alpha1',
    metadata: {
      name: 'test-component',
      namespace: 'default',
      annotations: {
        'backstage.io/source-location': 'url:https://github.com/test/repo',
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseApi.mockImplementation((ref: any) => {
      if (ref.id === 'core.config') return mockConfigApi;
      if (ref.id === 'core.discovery') return mockDiscoveryApi;
      if (ref.id === 'core.fetch') return mockFetchApi;
      return {};
    });

    mockUseEntity.mockReturnValue({
      entity: mockEntity,
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });

    mockConfigApi.getOptionalStringArray.mockImplementation((key: string) => {
      if (key === 'aiRules.allowedRuleTypes') {
        return [AIRuleType.CURSOR, AIRuleType.COPILOT];
      }
      if (key === 'aiRules.defaultRuleTypes') {
        return [AIRuleType.CURSOR];
      }
      return undefined;
    });

    mockConfigApi.getOptionalConfig.mockReturnValue({});
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useAiRules());

    expect(result.current.rules).toEqual([]);
    // Loading may be true initially as it starts fetching
    expect(result.current.error).toBeNull();
    expect(result.current.hasGitUrl).toBe(true);
    expect(result.current.componentName).toBe('test-component');
  });

  it('should detect when entity has no git URL', () => {
    mockUseEntity.mockReturnValue({
      entity: {
        ...mockEntity,
        metadata: {
          ...mockEntity.metadata,
          annotations: {},
        },
      },
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useAiRules());

    expect(result.current.hasGitUrl).toBe(false);
  });

  it('should handle GitHub tree URLs', () => {
    mockUseEntity.mockReturnValue({
      entity: {
        ...mockEntity,
        metadata: {
          ...mockEntity.metadata,
          annotations: {
            'backstage.io/source-location': 'url:https://github.com/test/repo/tree/main/src',
          },
        },
      },
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useAiRules());

    expect(result.current.hasGitUrl).toBe(true);
  });

  it('should handle GitHub blob URLs', () => {
    mockUseEntity.mockReturnValue({
      entity: {
        ...mockEntity,
        metadata: {
          ...mockEntity.metadata,
          annotations: {
            'backstage.io/source-location': 'url:https://github.com/test/repo/blob/main/file.ts',
          },
        },
      },
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useAiRules());

    expect(result.current.hasGitUrl).toBe(true);
  });

  it('should initialize with default rule types', async () => {
    const { result } = renderHook(() => useAiRules());

    await waitFor(() => {
      expect(result.current.selectedRuleTypes).toEqual([AIRuleType.CURSOR]);
    });
  });

  it('should return allowed rule types from config', () => {
    const { result } = renderHook(() => useAiRules());

    expect(result.current.allowedRuleTypes).toEqual([AIRuleType.CURSOR, AIRuleType.COPILOT]);
  });

  it('should use default allowed rule types when not configured', () => {
    mockConfigApi.getOptionalStringArray.mockReturnValue(undefined);

    const { result } = renderHook(() => useAiRules());

    expect(result.current.allowedRuleTypes).toEqual([
      AIRuleType.CURSOR,
      AIRuleType.COPILOT,
      AIRuleType.CLINE,
      AIRuleType.CLAUDE_CODE,
    ]);
  });

  it('should fetch rules successfully', async () => {
    const mockRules = [
      { type: AIRuleType.CURSOR, content: 'test rule', fileName: 'test.md' },
    ];

    mockFetchApi.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ rules: mockRules }),
    });

    const { result } = renderHook(() => useAiRules());

    await waitFor(() => {
      expect(result.current.rules).toEqual(mockRules);
    });
  });

  it('should handle fetch errors', async () => {
    mockFetchApi.fetch.mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });

    const { result } = renderHook(() => useAiRules());

    await waitFor(() => {
      expect(result.current.error).toContain('Failed to fetch AI rules');
    });
  });

  it('should handle network errors', async () => {
    mockFetchApi.fetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAiRules());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });
  });

  it('should apply filters', async () => {
    mockFetchApi.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ rules: [] }),
    });

    const { result } = renderHook(() => useAiRules());

    await waitFor(() => {
      expect(result.current.selectedRuleTypes).toBeDefined();
    });

    act(() => {
      result.current.setSelectedRuleTypes([AIRuleType.COPILOT]);
    });

    expect(result.current.hasUnappliedChanges).toBe(true);

    act(() => {
      result.current.applyFilters();
    });

    await waitFor(() => {
      expect(result.current.appliedRuleTypes).toContain(AIRuleType.COPILOT);
    });
  });

  it('should reset filters', async () => {
    mockFetchApi.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ rules: [] }),
    });

    const { result } = renderHook(() => useAiRules());

    await waitFor(() => {
      expect(result.current.selectedRuleTypes).toBeDefined();
    });

    act(() => {
      result.current.setSelectedRuleTypes([]);
    });

    act(() => {
      result.current.resetFilters();
    });

    await waitFor(() => {
      // Check that both types are present (order may vary)
      expect(result.current.selectedRuleTypes).toContain(AIRuleType.CURSOR);
      expect(result.current.selectedRuleTypes).toContain(AIRuleType.COPILOT);
      expect(result.current.selectedRuleTypes).toHaveLength(2);
    });
  });

  it('should clear rules when no rule types selected', async () => {
    mockFetchApi.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ rules: [{ type: AIRuleType.CURSOR, content: 'test', fileName: 'test.md' }] }),
    });

    const { result } = renderHook(() => useAiRules());

    await waitFor(() => {
      expect(result.current.rules).toHaveLength(1);
    });

    act(() => {
      result.current.setSelectedRuleTypes([]);
    });

    act(() => {
      result.current.applyFilters();
    });

    expect(result.current.rules).toEqual([]);
    expect(result.current.hasSearched).toBe(true);
  });

  it('should group rules by type', async () => {
    const mockRules = [
      { type: AIRuleType.CURSOR, content: 'cursor rule 1', fileName: 'cursor1.md' },
      { type: AIRuleType.CURSOR, content: 'cursor rule 2', fileName: 'cursor2.md' },
      { type: AIRuleType.COPILOT, content: 'copilot rule', fileName: 'copilot.md' },
    ];

    mockFetchApi.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ rules: mockRules }),
    });

    const { result } = renderHook(() => useAiRules());

    await waitFor(() => {
      expect(result.current.rules).toEqual(mockRules);
    });

    expect(result.current.rulesByType[AIRuleType.CURSOR]).toHaveLength(2);
    expect(result.current.rulesByType[AIRuleType.COPILOT]).toHaveLength(1);
    expect(result.current.totalRules).toBe(3);
  });

  it('should not fetch if no git URL', async () => {
    mockUseEntity.mockReturnValue({
      entity: {
        ...mockEntity,
        metadata: {
          ...mockEntity.metadata,
          annotations: {},
        },
      },
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });

    renderHook(() => useAiRules());

    expect(mockFetchApi.fetch).not.toHaveBeenCalled();
  });
});

