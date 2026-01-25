import { renderHook, waitFor } from '@testing-library/react';
import { useMCPServers } from './useMCPServers';
import { useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  useApi: jest.fn(),
}));

jest.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: jest.fn(),
}));

const mockUseApi = useApi as jest.MockedFunction<typeof useApi>;
const mockUseEntity = useEntity as jest.MockedFunction<typeof useEntity>;

describe('useMCPServers', () => {
  const mockApi = {
    getMCPServers: jest.fn(),
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
    
    mockUseApi.mockReturnValue(mockApi);
    
    mockUseEntity.mockReturnValue({
      entity: mockEntity,
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });
  });

  it('should return initial loading state', () => {
    mockApi.getMCPServers.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMCPServers());

    expect(result.current.loading).toBe(true);
    expect(result.current.servers).toEqual([]);
    expect(result.current.error).toBeUndefined();
    expect(result.current.hasGitUrl).toBe(true);
  });

  it('should fetch MCP servers successfully', async () => {
    const mockServers = [
      { name: 'server1', type: 'local', command: 'node', args: ['server.js'] },
      { name: 'server2', type: 'remote', url: 'http://example.com' },
    ];

    mockApi.getMCPServers.mockResolvedValue({ servers: mockServers });

    const { result } = renderHook(() => useMCPServers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.servers).toEqual(mockServers);
    expect(result.current.error).toBeUndefined();
  });

  it('should handle fetch errors', async () => {
    mockApi.getMCPServers.mockRejectedValue(new Error('API error'));

    const { result } = renderHook(() => useMCPServers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('API error');
    expect(result.current.servers).toEqual([]);
  });

  it('should set hasGitUrl to false when no source location', async () => {
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

    const { result } = renderHook(() => useMCPServers());

    await waitFor(() => {
      expect(result.current.hasGitUrl).toBe(false);
    });

    expect(mockApi.getMCPServers).not.toHaveBeenCalled();
  });

  it('should clean up tree URLs', async () => {
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

    mockApi.getMCPServers.mockResolvedValue({ servers: [] });

    renderHook(() => useMCPServers());

    await waitFor(() => {
      expect(mockApi.getMCPServers).toHaveBeenCalledWith('https://github.com/test/repo');
    });
  });

  it('should clean up master branch URLs', async () => {
    mockUseEntity.mockReturnValue({
      entity: {
        ...mockEntity,
        metadata: {
          ...mockEntity.metadata,
          annotations: {
            'backstage.io/source-location': 'url:https://github.com/test/repo/tree/master/lib',
          },
        },
      },
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });

    mockApi.getMCPServers.mockResolvedValue({ servers: [] });

    renderHook(() => useMCPServers());

    await waitFor(() => {
      expect(mockApi.getMCPServers).toHaveBeenCalledWith('https://github.com/test/repo');
    });
  });

  it('should provide refetch function', async () => {
    mockApi.getMCPServers.mockResolvedValue({ servers: [] });

    const { result } = renderHook(() => useMCPServers());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.refetch).toBeDefined();
    expect(typeof result.current.refetch).toBe('function');

    // Call refetch
    await result.current.refetch();

    expect(mockApi.getMCPServers).toHaveBeenCalledTimes(2);
  });
});

