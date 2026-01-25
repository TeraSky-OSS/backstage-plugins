import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { useDevpod } from './useDevpod';
import { useEntity } from '@backstage/plugin-catalog-react';
import { DevpodProvider } from '../components/DevpodProvider/DevpodProvider';
import { DevpodIDE } from '../types';

jest.mock('@backstage/plugin-catalog-react', () => ({
  useEntity: jest.fn(),
}));

const mockUseEntity = useEntity as jest.MockedFunction<typeof useEntity>;

describe('useDevpod', () => {
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
    spec: {},
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DevpodProvider defaultIde={DevpodIDE.VSCODE}>
      {children}
    </DevpodProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseEntity.mockReturnValue({
      entity: mockEntity,
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useDevpod(), { wrapper });

    expect(result.current.gitUrl).toBe('https://github.com/test/repo');
    expect(result.current.hasGitUrl).toBe(true);
    expect(result.current.componentName).toBe('test-component');
    expect(result.current.selectedIde).toBe(DevpodIDE.VSCODE);
    expect(result.current.devpodUrl).toContain('https://devpod.sh/open#');
  });

  it('should handle entity without git URL', () => {
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

    const { result } = renderHook(() => useDevpod(), { wrapper });

    expect(result.current.gitUrl).toBeUndefined();
    expect(result.current.hasGitUrl).toBe(false);
    expect(result.current.devpodUrl).toBe('');
  });

  it('should handle GitHub tree URLs with main branch and subpath', () => {
    mockUseEntity.mockReturnValue({
      entity: {
        ...mockEntity,
        metadata: {
          ...mockEntity.metadata,
          annotations: {
            'backstage.io/source-location': 'url:https://github.com/test/repo/tree/main/src/components',
          },
        },
      },
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useDevpod(), { wrapper });

    expect(result.current.gitUrl).toBe('https://github.com/test/repo@subpath:src/components');
    expect(result.current.hasGitUrl).toBe(true);
  });

  it('should handle GitHub tree URLs with non-main branch', () => {
    mockUseEntity.mockReturnValue({
      entity: {
        ...mockEntity,
        metadata: {
          ...mockEntity.metadata,
          annotations: {
            'backstage.io/source-location': 'url:https://github.com/test/repo/tree/develop/src',
          },
        },
      },
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useDevpod(), { wrapper });

    expect(result.current.gitUrl).toBe('https://github.com/test/repo@develop');
    expect(result.current.hasGitUrl).toBe(true);
  });

  it('should handle GitHub blob URLs with main branch and subpath', () => {
    mockUseEntity.mockReturnValue({
      entity: {
        ...mockEntity,
        metadata: {
          ...mockEntity.metadata,
          annotations: {
            'backstage.io/source-location': 'url:https://github.com/test/repo/blob/main/package.json',
          },
        },
      },
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useDevpod(), { wrapper });

    expect(result.current.gitUrl).toBe('https://github.com/test/repo@subpath:package.json');
    expect(result.current.hasGitUrl).toBe(true);
  });

  it('should handle GitHub blob URLs with non-main branch', () => {
    mockUseEntity.mockReturnValue({
      entity: {
        ...mockEntity,
        metadata: {
          ...mockEntity.metadata,
          annotations: {
            'backstage.io/source-location': 'url:https://github.com/test/repo/blob/feature/file.ts',
          },
        },
      },
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useDevpod(), { wrapper });

    expect(result.current.gitUrl).toBe('https://github.com/test/repo@feature');
    expect(result.current.hasGitUrl).toBe(true);
  });

  it('should allow changing selected IDE', () => {
    const { result } = renderHook(() => useDevpod(), { wrapper });

    expect(result.current.selectedIde).toBe(DevpodIDE.VSCODE);

    act(() => {
      result.current.setSelectedIde(DevpodIDE.CURSOR);
    });

    expect(result.current.selectedIde).toBe(DevpodIDE.CURSOR);
    expect(result.current.devpodUrl).toContain(`ide=${DevpodIDE.CURSOR}`);
  });

  it('should generate correct devpod URL', () => {
    const { result } = renderHook(() => useDevpod(), { wrapper });

    const url = result.current.devpodUrl;
    
    expect(url).toContain('https://devpod.sh/open#');
    expect(url).toContain(encodeURIComponent('https://github.com/test/repo'));
    expect(url).toContain('workspace=test-component-');
    expect(url).toContain(`ide=${DevpodIDE.VSCODE}`);
  });

  it('should handle trailing slashes in git URL', () => {
    mockUseEntity.mockReturnValue({
      entity: {
        ...mockEntity,
        metadata: {
          ...mockEntity.metadata,
          annotations: {
            'backstage.io/source-location': 'url:https://github.com/test/repo/',
          },
        },
      },
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useDevpod(), { wrapper });

    expect(result.current.gitUrl).toBe('https://github.com/test/repo');
  });

  it('should handle multiple trailing slashes in git URL', () => {
    mockUseEntity.mockReturnValue({
      entity: {
        ...mockEntity,
        metadata: {
          ...mockEntity.metadata,
          annotations: {
            'backstage.io/source-location': 'url:https://github.com/test/repo///',
          },
        },
      },
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useDevpod(), { wrapper });

    expect(result.current.gitUrl).toBe('https://github.com/test/repo');
  });

  it('should handle source annotation without url: prefix', () => {
    mockUseEntity.mockReturnValue({
      entity: {
        ...mockEntity,
        metadata: {
          ...mockEntity.metadata,
          annotations: {
            'backstage.io/source-location': 'https://github.com/test/repo',
          },
        },
      },
      loading: false,
      error: undefined,
      refresh: jest.fn(),
    });

    const { result } = renderHook(() => useDevpod(), { wrapper });

    expect(result.current.gitUrl).toBeUndefined();
    expect(result.current.hasGitUrl).toBe(false);
  });
});

